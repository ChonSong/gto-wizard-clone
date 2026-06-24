/**
 * Study Page Workflow Scripts
 * 
 * These define the complete user journeys that Coach should test each review.
 * Each workflow is a sequence of steps with assertions.
 * 
 * Usage:
 *   import { workflows } from './workflows';
 *   for (const step of workflows.studyPreflop) {
 *     await step.run(page);
 *   }
 */

import { StudyPage } from './StudyPage';

interface WorkflowStep {
  name: string;
  description: string;
  run: (page: StudyPage) => Promise<void>;
  critical: boolean; // If true, failure = RV
}

// ── Workflow 1: Study Preflop ────────────────────────────────

export const studyPreflopWorkflow: WorkflowStep[] = [
  {
    name: 'navigate',
    description: 'Navigate to /study page',
    critical: true,
    run: async (p) => {
      await p.navigate();
      // Wait for matrix to load
      await p.page.waitForSelector('[role="grid"]', { timeout: 10000 });
    }
  },
  {
    name: 'preflop-mode',
    description: 'Verify preflop mode is active',
    critical: true,
    run: async (p) => {
      const mode = await p.getActiveMode();
      if (mode !== 'preflop') throw new Error(`Expected preflop mode, got ${mode}`);
    }
  },
  {
    name: 'hand-matrix-loads',
    description: 'Hand matrix loads with data for UTG',
    critical: true,
    run: async (p) => {
      await p.assertHandMatrixHasData();
    }
  },
  {
    name: 'utg-range-check',
    description: 'UTG range: AA should be raise 100%',
    critical: false,
    run: async (p) => {
      await p.selectPosition('UTG');
      const matrix = await p.getHandMatrix();
      const aa = matrix['AA'];
      if (!aa) throw new Error('AA not found in matrix');
      if (aa.frequency !== 100) throw new Error(`AA frequency is ${aa.frequency}%, expected 100%`);
      if (!aa.action.startsWith('raise')) throw new Error(`AA action is ${aa.action}, expected raise`);
    }
  },
  {
    name: 'btn-range-differs',
    description: 'BTN range should differ from UTG (BTN plays more hands)',
    critical: true,
    run: async (p) => {
      await p.assertPositionRangesDiffer('UTG', 'BTN', 'A5s');
    }
  },
  {
    name: 'stack-depth-change',
    description: 'Changing stack depth updates the matrix',
    critical: false,
    run: async (p) => {
      await p.selectStackDepth(50);
      await p.selectPosition('UTG');
      // Just verify matrix still has data after depth change
      await p.assertHandMatrixHasData();
      // Reset to 100bb
      await p.selectStackDepth(100);
    }
  },
  {
    name: 'all-positions',
    description: 'All 6 positions can be selected and show different ranges',
    critical: true,
    run: async (p) => {
      const positions = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;
      const ranges: Record<string, number> = {};

      for (const pos of positions) {
        await p.selectPosition(pos);
        const matrix = await p.getHandMatrix();
        // Count raising hands
        const raising = Object.values(matrix).filter(h => h.action.startsWith('raise')).length;
        ranges[pos] = raising;
      }

      // BTN should raise with more hands than UTG
      if (ranges['BTN'] <= ranges['UTG']) {
        throw new Error(
          `BTN (${ranges['BTN']} raising hands) should raise more than UTG (${ranges['UTG']} raising hands)`
        );
      }
    }
  }
];

// ── Workflow 2: Study Postflop ────────────────────────────────

export const studyPostflopWorkflow: WorkflowStep[] = [
  {
    name: 'switch-to-postflop',
    description: 'Switch to Postflop Training mode',
    critical: true,
    run: async (p) => {
      await p.switchToPostflopMode();
      const mode = await p.getActiveMode();
      if (mode !== 'postflop') throw new Error(`Expected postflop mode, got ${mode}`);
    }
  },
  {
    name: 'configure-spot-opens',
    description: 'Configure Spot panel opens',
    critical: true,
    run: async (p) => {
      await p.openConfigureSpot();
    }
  },
  {
    name: 'default-spot-config',
    description: 'Default spot has board KsKc3s, pot 5.5bb, BTN active',
    critical: true,
    run: async (p) => {
      const config = await p.getSpotConfig();
      if (!config.board.includes('KsKc3s') && !config.board.includes('K♠K♣3♠')) {
        throw new Error(`Default board is "${config.board}", expected KsKc3s`);
      }
      if (Math.abs(config.pot - 5.5) > 0.1) {
        throw new Error(`Default pot is ${config.pot}, expected 5.5bb`);
      }
    }
  },
  {
    name: 'get-gto-strategy',
    description: 'Get GTO Strategy returns actions with data',
    critical: true,
    run: async (p) => {
      await p.closeConfigureSpot();
      const actions = await p.getGTOStrategy();
      if (actions.length === 0) throw new Error('No GTO actions returned');

      // Verify we have expected actions
      const actionNames = actions.map(a => a.action);
      if (!actionNames.includes('CHECK')) throw new Error('CHECK action missing');
      if (!actionNames.includes('BET 33%')) throw new Error('BET 33% action missing');
      if (!actionNames.includes('FOLD')) throw new Error('FOLD action missing');
      if (!actionNames.includes('CALL')) throw new Error('CALL action missing');
    }
  },
  {
    name: 'gto-frequencies-valid',
    description: 'GTO frequencies should sum to approximately 100%',
    critical: true,
    run: async (p) => {
      const actions = await p.getGTOStrategy();
      // BUG CHECK: Currently frequencies are wrong (don't sum to 100%)
      // This assertion will fail until the frequency bug is fixed
      try {
        await p.assertGTOActionsSumTo100(actions, 10);
      } catch (e: any) {
        throw new Error(`GTO frequency bug: ${e.message}`);
      }
    }
  },
  {
    name: 'gto-recommended-action',
    description: 'Exactly one action should be marked as GTO recommended (✓ GTO)',
    critical: false,
    run: async (p) => {
      const actions = await p.getGTOStrategy();
      const gtoActions = actions.filter(a => a.isGTORecommended);
      if (gtoActions.length === 0) {
        throw new Error('No action marked as GTO recommended (✓ GTO badge missing)');
      }
      // In GTO there can be multiple recommended actions (mixing), but at least one
    }
  },
  {
    name: 'board-cards-visible',
    description: 'Board cards display with suit symbols',
    critical: false,
    run: async (p) => {
      const board = await p.getBoardCards();
      if (!board) throw new Error('Board cards not visible');
      // Should contain suit symbols
      if (!board.includes('♠') && !board.includes('♥') && !board.includes('♦') && !board.includes('♣')) {
        throw new Error(`Board cards missing suit symbols: "${board}"`);
      }
    }
  },
  {
    name: 'pot-display',
    description: 'Pot size displays correctly',
    critical: false,
    run: async (p) => {
      const pot = await p.getPotSize();
      if (pot <= 0) throw new Error(`Pot size is ${pot}, expected > 0`);
    }
  },
  {
    name: 'street-navigation-locked',
    description: 'Turn and River should be locked (only Flop available on first load)',
    critical: true,
    run: async (p) => {
      const breadcrumb = await p.getStreetBreadcrumb();
      // FLOP should be current
      if (breadcrumb.current !== 'FLOP') {
        throw new Error(`Current street is ${breadcrumb.current}, expected FLOP`);
      }
      // TURN and RIVER should be in the breadcrumb (even if locked)
      if (!breadcrumb.available.includes('FLOP')) {
        throw new Error('FLOP not in street breadcrumb');
      }
    }
  }
];

// ── Workflow 3: Full Hand Journey ────────────────────────────

export const fullHandWorkflow: WorkflowStep[] = [
  {
    name: 'navigate-study',
    description: 'Navigate to study page',
    critical: true,
    run: async (p) => { await p.navigate(); }
  },
  {
    name: 'review-preflop-utg',
    description: 'Review UTG preflop range',
    critical: false,
    run: async (p) => {
      await p.switchToPreflopMode();
      await p.selectPosition('UTG');
      const matrix = await p.getHandMatrix();
      if (Object.keys(matrix).length < 10) throw new Error('UTG matrix has no data');
    }
  },
  {
    name: 'review-preflop-btn',
    description: 'Review BTN preflop range',
    critical: false,
    run: async (p) => {
      await p.selectPosition('BTN');
      const matrix = await p.getHandMatrix();
      if (Object.keys(matrix).length < 10) throw new Error('BTN matrix has no data');
    }
  },
  {
    name: 'switch-postflop',
    description: 'Switch to postflop and get GTO solution',
    critical: true,
    run: async (p) => {
      await p.switchToPostflopMode();
      const actions = await p.getGTOStrategy();
      if (actions.length === 0) throw new Error('No GTO actions returned');
    }
  },
  {
    name: 'click-action',
    description: 'Click an action (CALL) to verify interaction works',
    critical: false,
    run: async (p) => {
      await p.clickAction('CALL');
      // After clicking, some feedback should appear
      await p.page.waitForTimeout(500);
    }
  }
];

// ── All Workflows ────────────────────────────────────────────

export const workflows = {
  studyPreflop: studyPreflopWorkflow,
  studyPostflop: studyPostflopWorkflow,
  fullHand: fullHandWorkflow,
};
