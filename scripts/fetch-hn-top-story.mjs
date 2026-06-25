import { writeFile } from 'node:fs/promises'

const topStoriesUrl = 'https://hacker-news.firebaseio.com/v0/topstories.json'

async function getJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HN API request failed: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

function escapeEnvValue(value) {
  return value
    .replace(/\r?\n/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
}

const storyIds = await getJson(topStoriesUrl)
const firstStoryId = Array.isArray(storyIds) ? storyIds[0] : undefined
if (!Number.isInteger(firstStoryId)) {
  throw new Error('HN API returned no first story id')
}

const story = await getJson(`https://hacker-news.firebaseio.com/v0/item/${firstStoryId}.json`)
const title = typeof story?.title === 'string' ? story.title.trim() : ''
if (!title) {
  throw new Error(`HN item ${firstStoryId} returned no title`)
}

await writeFile('/tmp/agent-qa.env', [
  `HN_FIRST_STORY_TITLE="${escapeEnvValue(title)}"`,
  `HN_FIRST_STORY_ID=${firstStoryId}`,
  '',
].join('\n'), 'utf-8')
