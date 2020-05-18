if (process.env.NODE_ENV === 'development') {
  require('dotenv').config();
}
const {json, send} = require('micro')
const crypto = require('crypto')
const matter = require('gray-matter')
const yaml = require('js-yaml')
const {Octokit} = require('@octokit/rest')
const octokit = new Octokit({auth: process.env.GITHUB_ACCESS_TOKEN})

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

  const content = generateFinalMarkdown(body.post, !!process.env.ESA_DISABLE_DEFAULT_FRONTMATTER)

  const filename = (!!process.env.GITHUB_FILENAME_BY_TITLE ? parsePost(body.post).title : body.post.number) + '.md'
  const path = process.env.GITHUB_PATH.replace(/\/$/, '') + '/' + filename
  const message = `[esa2github] ${body.post.message}`

  await pushToGitHub(process.env.GITHUB_OWNER, process.env.GITHUB_REPO, path, message, content)

  res.end('Done')
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

const generateFinalMarkdown = (post, disableDefaultFrontmatter) => {
  const frontmatterInBodyMatches = post.body_md.match(/^```[\r\n]+(---[\r\n]+((?!^---)[^])*[\r\n]+---)[\r\n]+```/)
  const actualContent = post.body_md.replace(frontmatterInBodyMatches[0], '').trim()

  // @see https://github.com/jonschlinkert/gray-matter/issues/62#issuecomment-577628177
  const frontmatterInBody = matter(frontmatterInBodyMatches[1], {
    engines: {
      yaml: s => yaml.safeLoad(s, {schema: yaml.JSON_SCHEMA})
    }
  }).data

  const frontmatter = Object.assign(disableDefaultFrontmatter ? {} : parsePost(post), frontmatterInBody)

  // @see https://stackoverflow.com/questions/57498639/nodeca-js-yaml-appending-on-long-strings
  return matter.stringify("\n" + actualContent, frontmatter, {lineWidth: -1})
}

const pushToGitHub = async (owner, repo, path, message, content) => {
  // need to know sha value if want to update existent file
  let file
  try {
    file = await octokit.repos.getContents({
      owner,
      repo,
      path,
    })
  } catch (e) {
    file = null
    if (e.status !== 404) {
      throw e
    }
  }

  return await octokit.repos.createOrUpdateFile({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    sha: file ? file.data.sha : null,
  })
}
