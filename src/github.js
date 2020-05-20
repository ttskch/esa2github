const {Octokit} = require('@octokit/rest')
const octokit = new Octokit({auth: process.env.GITHUB_ACCESS_TOKEN})

module.exports.push = async (owner, repo, path, message, content) => {
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
