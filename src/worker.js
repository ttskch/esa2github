require('dotenv').config()
const Queue = require('bull')
const pushToGitHubQueue = new Queue('push-to-github', process.env.REDIS_URL)
const dayjs = require('dayjs')
const github = require('./github')

let timer

const processor = async (job, done) => {
  const {owner, repo, branch, path, message, content, executeAfter} = job.data
  if (dayjs().isAfter(executeAfter)) {
    try {
      await github.push(owner, repo, branch, path, message, content)
      console.log(`pushed via job ${job.id}`)
      done()
      clearInterval(timer)
    } catch (e) {
      console.error(e)
      done(e)
    }
  }
}

// process every minute
pushToGitHubQueue.process((job, done) => {
  timer = setInterval(() => processor(job, done), 1000 * 60)
})
