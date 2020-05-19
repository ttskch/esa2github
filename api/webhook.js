if (process.env.NODE_ENV === 'development') {
  require('dotenv').config();
}
const {json, send} = require('micro')
const crypto = require('crypto')
const matter = require('gray-matter')
const yaml = require('js-yaml')
const {Octokit} = require('@octokit/rest')
const octokit = new Octokit({auth: process.env.GITHUB_ACCESS_TOKEN})
const Agenda = require('agenda')
const dayjs = require('dayjs')

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
  const path = process.env.GITHUB_PATH.replace(/\/$/, '') + '/' + filename
  const message = `[esa2github] ${body.post.message}`

  // schedule commitment or commit immediately
  if (commitment.frontmatter && commitment.frontmatter.commitAt && !!process.env.MONGODB_URI) {
    const agenda = new Agenda({db: {address: process.env.MONGODB_URI, options: {useUnifiedTopology: true}}});

    const jobName = `pushToGitHub${dayjs().format('YYYYMMDDHHmmss')}`

    agenda.define(jobName, async job => {
      try {
        await pushToGitHub(process.env.GITHUB_OWNER, process.env.GITHUB_REPO, path, message, commitment.content)
      } catch (e) {
        console.error(e)
      }
    });

    await (async () => {
      await agenda.start();
      await agenda.schedule(dayjs(commitment.frontmatter.commitAt), jobName)
    })();

    res.end('Scheduled')
    return
  }

  await pushToGitHub(process.env.GITHUB_OWNER, process.env.GITHUB_REPO, path, message, commitment.content)
  res.end('Pushed')
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
  const frontmatterInBodyMatches = post.body_md.match(/^```[\r\n]+(---[\r\n]+((?!^---)[^])*[\r\n]+---)[\r\n]+```/)
  const actualContent = post.body_md.replace(frontmatterInBodyMatches[0], '').trim()

  // @see https://github.com/jonschlinkert/gray-matter/issues/62#issuecomment-577628177
  const frontmatterInBody = matter(frontmatterInBodyMatches[1], {
    engines: {
      yaml: s => yaml.safeLoad(s, {schema: yaml.JSON_SCHEMA})
    }
  }).data

  const frontmatter = Object.assign(disableDefaultFrontmatter ? {} : parsePost(post), frontmatterInBody)

  return {
    frontmatter: frontmatter,
    actualContent: actualContent,
    // @see https://stackoverflow.com/questions/57498639/nodeca-js-yaml-appending-on-long-strings
    content: matter.stringify("\n" + actualContent, frontmatter, {lineWidth: -1})
  }
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
