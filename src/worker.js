require('dotenv').config()
const Agenda = require('agenda')
const agenda = new Agenda({db: {address: process.env.MONGODB_URI, options: {useUnifiedTopology: true}}})
const github = require('./github')

agenda.define('push to github', async job => {
  const {owner, repo, path, message, content} = job.attrs.data
  try {
    await github.push(owner, repo, path, message, content)
    console.log('pushed')
  } catch (e) {
    console.error(e)
  }
});

(async () => {
  await agenda.start()
  await agenda.every('1 minutes', 'push to github')
})()
