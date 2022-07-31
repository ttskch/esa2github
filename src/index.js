require('dotenv').config()
const {json, send} = require('micro')
const crypto = require('crypto')
const matter = require('gray-matter')
const Queue = require('bull')
const dayjs = require('dayjs')
const github = require('./github')

module.exports = async (req, res) => {
  if (req.method.toLowerCase() !== 'post') {
    send(res, 404)
  }

  const body = await json(req)

  // @see https://docs.esa.io/posts/37#X-Esa-Signature
  if (process.env.ESA_SECRET) {
    const signature = req.headers['x-esa-signature']
    const computedSignature = 'sha256=' + crypto.createHmac('sha256', process.env.ESA_SECRET).update(JSON.stringify(body)).digest('hex')
    if (signature !== computedSignature) {
      send(res, 403, 'Invalid signature')
    }
  }

  const commitment = generateCommitment(body.post, !!process.env.ESA_DISABLE_DEFAULT_FRONTMATTER)

  const filename = (!!process.env.GITHUB_FILENAME_BY_TITLE ? parsePost(body.post).title : body.post.number) + '.md'
  const path = (process.env.GITHUB_BASE_PATH.replace(/\/$/, '') + '/' + filename).replace(/^\//, '')
  const message = `[esa2github] ${body.post.message}`

  // schedule commitment or commit immediately
  if (commitment.frontmatter && commitment.frontmatter.commitAt && !!process.env.REDIS_URL) {
    const pushToGitHubQueue = new Queue('push-to-github', process.env.REDIS_URL)
    const job = await pushToGitHubQueue.add({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      branch: process.env.GITHUB_BRANCH,
      path,
      message,
      content: commitment.content,
      executeAfter: dayjs(commitment.frontmatter.commitAt),
    })
    console.log(`scheduled job ${job.id}`)

    res.end(`scheduled job ${job.id}`)
    return
  }

  await github.push(process.env.GITHUB_OWNER, process.env.GITHUB_REPO, process.env.GITHUB_BRANCH, path, message, commitment.content)
  console.log('pushed')

  res.end('pushed')
}

const parsePost = post => {
  const [, category, title, tagsText] = post.name.match(/^(.+)\/([^/ ]+)(( *#[^ ]+)*)$/)
  const tags = tagsText.trim().replace('#', '').split(/ +/)

  return {
    title,
    category,
    tags,
    published: !post.wip,
    number: post.number,
  }
}

const generateCommitment = (post, disableDefaultFrontmatter) => {
  const lineBreakMatcher = '(?:\r|\n|\r\n)'
  const frontmatterMatcher = '---' + lineBreakMatcher + '(?:[^](?!---' + lineBreakMatcher + '```))*' + lineBreakMatcher + '---'
  const frontmatterInBodyMatches = post.body_md.match(new RegExp('^```' + lineBreakMatcher + '(' + frontmatterMatcher + ')' + lineBreakMatcher + '```'))

  const actualContent = frontmatterInBodyMatches ? post.body_md.replace(frontmatterInBodyMatches[0], '').trimStart() : post.body_md
  const frontmatterInBody = frontmatterInBodyMatches ? matter(frontmatterInBodyMatches[1]).data : {}
  const frontmatter = Object.assign(disableDefaultFrontmatter ? {} : parsePost(post), frontmatterInBody)
  const content = disableDefaultFrontmatter
    ? (frontmatterInBodyMatches ? frontmatterInBodyMatches[1] + "\n\n" : '') + actualContent
    : matter.stringify("\n" + actualContent, frontmatter)

  return {
    frontmatter,
    actualContent,
    content,
  }
}
