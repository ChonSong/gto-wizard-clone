/**
 * StudyPage — Page Object Model for the GTO Wizard Study page
 * 
 * Uses stable aria-label selectors instead of brittle CSS class names.
 * All selectors verified against live DOM on 2026-06-24.
 * 
 * Usage in Coach reviews:
 *   import { StudyPage } from './tests/pom/StudyPage';
 *   const study = new StudyPage(page);
 *   await study.navigate();
 *   await study.selectPosition('BTN');
 *   const matrix = await study.getHandMatrix();
 *   assert(matrix['AA'].action === 'raise_2.5bb' && matrix['AA'].frequency === 100);
 */

export interface HandData {
  hand: string;
  action: string;       // e.g. 'raise_2.5bb', 'fold', 'call'
  frequency: number;    // 0-100
}

export interface GTOAction {
  action: string;       // e.g. 'CHECK', 'BET 33%', 'CALL', 'FOLD'
  frequency: number;    // GTO frequency % (should sum to ~100% across all actions)
  ev: number | null;   // Expected value in bb
  isGTORecommended: boolean;
}

export interface SpotConfig {
  board: string;        // e.g. 'KsKc3s'
  pot: number;          // in bb
  stack: number;        // in bb
  street: 'flop' | 'turn' | 'river';
  activePosition: string;
  positionsInHand: string[];
}

export class StudyPage {
  constructor(private page: any) {}

  // ── Navigation ──────────────────────────────────────────────

  async navigate(): Promise<void> {
    await this.page.goto('https://wiz.codeovertcp.com/study');
    await this.page.waitForLoadState('networkidle');
  }

  // ── Mode Selection ──────────────────────────────────────────

  async getActiveMode(): Promise<'preflop' | 'postflop'> {
    const preflopBtn = this.page.getByRole('button', { name: 'Preflop ranges mode' });
    const pressed = await preflopBtn.getAttribute('aria-pressed');
    return pressed === 'true' ? 'preflop' : 'postflop';
  }

  async switchToPreflopMode(): Promise<void> {
    const mode = await this.getActiveMode();
    if (mode !== 'preflop') {
      await this.page.getByRole('button', { name: 'Preflop ranges mode' }).click();
      await this.page.waitForTimeout(500);
    }
  }

  async switchToPostflopMode(): Promise<void> {
    const mode = await this.getActiveMode();
    if (mode !== 'postflop') {
      await this.page.getByRole('button', { name: 'Postflop training mode' }).click();
      await this.page.waitForTimeout(500);
    }
  }

  // ── Stack Depth ─────────────────────────────────────────────

  async getSelectedStackDepth(): Promise<number> {
    const btn = this.page.getByRole('button', { name: /selected/ });
    const label = await btn.getAttribute('aria-label');
    const match = label?.match(/(\d+)bb/);
    return match ? parseInt(match[1]) : 100;
  }

  async selectStackDepth(depth: 50 | 75 | 100 | 125 | 150 | 200): Promise<void> {
    await this.page.getByRole('button', { name: `${depth}bb stack depth` }).click();
    await this.page.waitForTimeout(300);
  }

  // ── Position Selection (Preflop) ───────────────────────────

  async selectPosition(position: 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB'): Promise<void> {
    await this.switchToPreflopMode();
    // Position cards use aria-label pattern: "{POS} position, {stack}bb stack"
    const card = this.page.getByRole('button', { name: new RegExp(`^${position} position`) });
    await card.click();
    await this.page.waitForTimeout(300);
  }

  async getActivePosition(): Promise<string> {
    const activeCard = this.page.getByRole('button', { name: /active/ });
    const label = await activeCard.getAttribute('aria-label');
    const match = label?.match(/^(UTG|HJ|CO|BTN|SB|BB)/);
    return match ? match[1] : 'UTG';
  }

  // ── Hand Matrix (Preflop) ──────────────────────────────────

  async getHandMatrix(): Promise<Record<string, HandData>> {
    await this.switchToPreflopMode();
    const cells = this.page.getByRole('gridcell');
    const count = await cells.count();
    const matrix: Record<string, HandData> = {};

    for (let i = 0; i < count; i++) {
      const cell = cells.nth(i);
      const text = await cell.textContent();
      // Format: "AA FoldRaise 2.5Allin 100" or "AKs87%"
      const handMatch = text?.match(/^(AA|KK|QQ|JJ|TT|99|88|77|66|55|44|33|22|AKs|AQs|AJs|ATs|A9s|A8s|A7s|A6s|A5s|A4s|A3s|A2s|AKo|AQo|AJo|ATo|A9o|A8o|A7o|A6o|A5o|A4o|A3o|A2o|KQs|KJs|KTs|K9s|K8s|K7s|K6s|K5s|K4s|K3s|K2s|KQo|KJo|KTo|K9o|K8o|K7o|K6o|K5o|K4o|K3o|K2o|QJs|QTs|Q9s|Q8s|Q7s|Q6s|Q5s|Q4s|Q3s|Q2s|QJo|QTo|Q9o|Q8o|Q7o|Q6o|Q5o|Q4o|Q3o|Q2o|JTs|J9s|J8s|J7s|J6s|J5s|J4s|J3s|J2s|JTo|J9o|J8o|J7o|J6o|J5o|J4o|J3o|J2o|T9s|T8s|T7s|T6s|T5s|T4s|T3s|T2s|T9o|T8o|T7o|T6o|T5o|T4o|T3o|T2o|98s|97s|96s|95s|94s|93s|92s|98o|97o|96o|95o|94o|93o|92o|87s|86s|85s|84s|83s|82s|87o|86o|85o|84o|83o|82o|76s|75s|74s|73s|72s|76o|75o|74o|73o|72o|65s|64s|63s|62s|65o|64o|63o|62o|54s|53s|52s|54o|53o|52o|43s|42s|43o|42o|32s|32o)/);
      if (!handMatch) continue;

      const hand = handMatch[1];
      const cellText = text || '';

      // Determine action from text
      let action = 'fold';
      if (cellText.includes('Raise') || cellText.includes('raise')) {
        const raiseMatch = cellText.match(/Raise ([\d.]+)/);
        action = raiseMatch ? `raise_${raiseMatch[1]}bb` : 'raise';
      } else if (cellText.includes('Call') || cellText.includes('call')) {
        action = 'call';
      }

      // Extract frequency
      const freqMatch = cellText.match(/(\d+)%/);
      const frequency = freqMatch ? parseInt(freqMatch[1]) : (action === 'fold' ? 100 : 0);

      matrix[hand] = { hand, action, frequency };
    }

    return matrix;
  }

  async getSelectedHand(): Promise<string | null> {
    const selected = this.page.getByRole('gridcell', { selected: true });
    const count = await selected.count();
    if (count === 0) return null;
    const text = await selected.textContent();
    const match = text?.match(/^(AA|KK|QQ|JJ|TT|99|88|77|66|55|44|33|22|AKs|AQs|AJs|ATs|A9s|A8s|A7s|A6s|A5s|A4s|A3s|A2s|AKo|AQo|AJo|ATo|A9o|A8o|A7o|A6o|A5o|A4o|A3o|A2o|KQs|KJs|KTs|K9s|K8s|K7s|K6s|K5s|K4s|K3s|K2s|KQo|KJo|KTo|K9o|K8o|K7o|K6o|K5o|K4o|K3o|K2o|QJs|QTs|Q9s|Q8s|Q7s|Q6s|Q5s|Q4s|Q3s|Q2s|QJo|QTo|Q9o|Q8o|Q7o|Q6o|Q5o|Q4o|Q3o|Q2o|JTs|J9s|J8s|J7s|J6s|J5s|J4s|J3s|J2s|JTo|J9o|J8o|J7o|J6o|J5o|J4o|J3o|J2o|T9s|T8s|T7s|T6s|T5s|T4s|T3s|T2s|T9o|T8o|T7o|T6o|T5o|T4o|T3o|T2o|98s|97s|96s|95s|94s|93s|92s|98o|97o|96o|95o|94o|93o|92o|87s|86s|85s|84s|83s|82s|87o|86o|85o|84o|83o|82o|76s|75s|74s|73s|72s|76o|75o|74o|73o|72o|65s|64s|63s|62s|65o|64o|63o|62o|54s|53s|52s|54o|53o|52o|43s|42s|43o|42o|32s|32o)/);
    return match ? match[1] : null;
  }

  async clickHandInMatrix(hand: string): Promise<void> {
    await this.switchToPreflopMode();
    const cell = this.page.getByRole('gridcell').filter({ hasText: hand });
    await cell.click();
    await this.page.waitForTimeout(300);
  }

  // ── Postflop: Configure Spot ────────────────────────────────

  async openConfigureSpot(): Promise<void> {
    await this.switchToPostflopMode();
    const btn = this.page.getByRole('button', { name: 'Open configure spot panel' });
    const expanded = await btn.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await btn.click();
      await this.page.waitForTimeout(500);
    }
  }

  async closeConfigureSpot(): Promise<void> {
    const btn = this.page.getByRole('button', { name: 'Close configure spot panel' });
    const expanded = await btn.getAttribute('aria-expanded');
    if (expanded === 'true') {
      await btn.click();
      await this.page.waitForTimeout(300);
    }
  }

  async setBoardCards(board: string): Promise<void> {
    await this.openConfigureSpot();
    const input = this.page.getByRole('textbox', { name: 'Board cards' });
    await input.fill('');
    await input.fill(board);
    await this.page.waitForTimeout(300);
  }

  async setPotSize(pot: number): Promise<void> {
    await this.openConfigureSpot();
    const input = this.page.getByRole('spinbutton', { name: 'Pot size in big blinds' });
    await input.fill(pot.toString());
    await this.page.waitForTimeout(300);
  }

  async setStackDepthBB(stack: number): Promise<void> {
    await this.openConfigureSpot();
    const input = this.page.getByRole('spinbutton', { name: 'Stack depth in big blinds' });
    await input.fill(stack.toString());
    await this.page.waitForTimeout(300);
  }

  async setActivePosition(position: 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB'): Promise<void> {
    await this.openConfigureSpot();
    await this.page.getByRole('combobox', { name: 'Active position' }).selectOption(position);
    await this.page.waitForTimeout(300);
  }

  async togglePositionInHand(position: 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB'): Promise<void> {
    await this.openConfigureSpot();
    const checkbox = this.page.getByRole('checkbox', { name: position });
    await checkbox.click();
    await this.page.waitForTimeout(200);
  }

  async getSpotConfig(): Promise<SpotConfig> {
    await this.openConfigureSpot();
    const boardInput = this.page.getByRole('textbox', { name: 'Board cards' });
    const potInput = this.page.getByRole('spinbutton', { name: 'Pot size in big blinds' });
    const stackInput = this.page.getByRole('spinbutton', { name: 'Stack depth in big blinds' });
    const activePosSelect = this.page.getByRole('combobox', { name: 'Active position' });

    const board = await boardInput.inputValue();
    const pot = parseFloat(await potInput.inputValue());
    const stack = parseFloat(await stackInput.inputValue());
    const activePosition = await activePosSelect.inputValue();

    const positions: string[] = [];
    for (const pos of ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']) {
      const cb = this.page.getByRole('checkbox', { name: pos });
      if (await cb.isChecked()) positions.push(pos);
    }

    return {
      board,
      pot,
      stack,
      street: 'flop', // default
      activePosition,
      positionsInHand: positions
    };
  }

  // ── Postflop: GTO Strategy ──────────────────────────────────

  async getGTOStrategy(): Promise<GTOAction[]> {
    await this.switchToPostflopMode();
    await this.page.getByRole('button', { name: 'Get GTO strategy' }).click();
    // Wait for strategy to load
    await this.page.waitForTimeout(2000);

    const actions: GTOAction[] = [];
    const actionNames = ['CHECK', 'BET 33%', 'BET 50%', 'BET 75%', 'BET 125%', 'FOLD', 'CALL', 'RAISE 50%', 'RAISE 100%', 'ALL IN 100.0'];

    for (const actionName of actionNames) {
      try {
        const btn = this.page.getByRole('button', { name: actionName });
        const count = await btn.count();
        if (count === 0) continue;

        const text = await btn.textContent();
        const isGTORecommended = text?.includes('✓ GTO') || false;

        // Parse frequency and EV from text like "BET 33%2.0 (36%)" or "CALL3.0 (55%)"
        const freqMatch = text?.match(/\((\d+)%\)/);
        const frequency = freqMatch ? parseInt(freqMatch[1]) : 0;

        const evMatch = text?.match(/EV:\s*([\d.]+)/);
        const ev = evMatch ? parseFloat(evMatch[1]) : null;

        actions.push({
          action: actionName,
          frequency,
          ev,
          isGTORecommended
        });
      } catch {
        // Action not available for this spot
      }
    }

    return actions;
  }

  async clickAction(action: string): Promise<void> {
    await this.switchToPostflopMode();
    const btn = this.page.getByRole('button', { name: action });
    await btn.click();
    await this.page.waitForTimeout(500);
  }

  // ── Postflop: Street Navigation ─────────────────────────────

  async getStreetBreadcrumb(): Promise<{ current: string; available: string[] }> {
    await this.switchToPostflopMode();
    const nav = this.page.getByRole('navigation', { name: 'Street navigation' });
    const text = await nav.textContent();

    const streets = ['PREFLOP', 'FLOP', 'TURN', 'RIVER'];
    const available: string[] = [];
    let current = 'FLOP';

    for (const street of streets) {
      if (text?.includes(street)) {
        available.push(street);
        // Current street is the one without 🔒
        if (!text?.includes(street + '🔒') && !text?.includes(street + ' 🔒')) {
          current = street;
        }
      }
    }

    return { current, available };
  }

  async advanceToStreet(street: 'FLOP' | 'TURN' | 'RIVER'): Promise<boolean> {
    await this.switchToPostflopMode();
    const nav = this.page.getByRole('navigation', { name: 'Street navigation' });
    const text = await nav.textContent();

    // Check if street is locked
    if (text?.includes(street + '🔒') || text?.includes(street + ' 🔒')) {
      return false; // Street is locked
    }

    // Click on the street
    await nav.getByText(street).click();
    await this.page.waitForTimeout(1000);
    return true;
  }

  // ── Postflop: Board Display ─────────────────────────────────

  async getBoardCards(): Promise<string> {
    await this.switchToPostflopMode();
    // Board cards are rendered as styled text with suit symbols
    const boardArea = this.page.locator('text=/[♠♥♦♣]/').first();
    const text = await boardArea.textContent();
    return text?.trim() || '';
  }

  async getPotSize(): Promise<number> {
    await this.switchToPostflopMode();
    const potText = this.page.locator('text=/POT/').first();
    const text = await potText.textContent();
    const match = text?.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  // ── Assertions ──────────────────────────────────────────────

  async assertHandMatrixHasData(): Promise<void> {
    const matrix = await this.getHandMatrix();
    const hands = Object.keys(matrix);
    if (hands.length < 10) {
      throw new Error(`Hand matrix has only ${hands.length} hands, expected 169`);
    }
    // Check that at least some hands have non-zero frequency
    const raisingHands = Object.values(matrix).filter(h => h.action.startsWith('raise'));
    if (raisingHands.length === 0) {
      throw new Error('No raising hands found in matrix — data may not have loaded');
    }
  }

  async assertPositionRangesDiffer(pos1: string, pos2: string, hand: string): Promise<void> {
    await this.selectPosition(pos1 as any);
    const matrix1 = await this.getHandMatrix();

    await this.selectPosition(pos2 as any);
    const matrix2 = await this.getHandMatrix();

    const data1 = matrix1[hand];
    const data2 = matrix2[hand];

    if (!data1 || !data2) {
      throw new Error(`Hand ${hand} not found in matrix`);
    }

    if (data1.frequency === data2.frequency && data1.action === data2.action) {
      throw new Error(
        `Expected ${hand} to differ between ${pos1} and ${pos2}, ` +
        `but both show ${data1.action} ${data1.frequency}%`
      );
    }
  }

  async assertGTOActionsSumTo100(actions: GTOAction[], tolerance: number = 5): Promise<void> {
    // In GTO, the frequencies should sum to approximately 100%
    // (some actions may have 0% frequency)
    const totalFreq = actions.reduce((sum, a) => sum + a.frequency, 0);
    if (Math.abs(totalFreq - 100) > tolerance) {
      throw new Error(
        `GTO frequencies sum to ${totalFreq}%, expected ~100% (±${tolerance}%). ` +
        `Actions: ${actions.map(a => `${a.action}: ${a.frequency}%`).join(', ')}`
      );
    }
  }

  async assertStreetUnlocked(street: 'TURN' | 'RIVER'): Promise<void> {
    const breadcrumb = await this.getStreetBreadcrumb();
    if (!breadcrumb.available.includes(street)) {
      throw new Error(
        `Street ${street} is locked. Available streets: ${breadcrumb.available.join(', ')}`
      );
    }
  }

  async assertNoConsoleErrors(): Promise<void> {
    const messages = await this.page.evaluate(() => {
      return (window as any).__errors || [];
    });
    if (messages.length > 0) {
      throw new Error(`Console errors found: ${messages.join('; ')}`);
    }
  }

  // ── Screenshots ─────────────────────────────────────────────

  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `/home/sc/.hermes/cache/screenshots/study-${name}.png` });
  }
}
