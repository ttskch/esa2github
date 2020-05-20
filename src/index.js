require('dotenv').config()
const {json, send} = require('micro')
const crypto = require('crypto')
const matter = require('gray-matter')
const yaml = require('js-yaml')
const Agenda = require('agenda')
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
  if (commitment.frontmatter && commitment.frontmatter.commitAt && !!process.env.MONGODB_URI) {
    const agenda = new Agenda({db: {address: process.env.MONGODB_URI, options: {useUnifiedTopology: true}}});

    await (async () => {
      await agenda.start();
      await agenda.schedule(dayjs(commitment.frontmatter.commitAt), 'push to github', {
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO,
        branch: process.env.GITHUB_BRANCH || null,
        path,
        message,
        content: commitment.content,
      })
    })();
    console.log('scheduled')

    res.end('Scheduled')
    return
  }

  await github.push(process.env.GITHUB_OWNER, process.env.GITHUB_REPO, process.env.GITHUB_BRANCH || null, path, message, commitment.content)
  console.log('pushed')

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
