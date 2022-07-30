const {Octokit} = require('@octokit/rest')
const octokit = new Octokit({auth: process.env.GITHUB_ACCESS_TOKEN})

module.exports.push = async (owner, repo, branch, path, message, content) => {
  // need to know sha value if want to update existent file
  let file
  try {
    file = await octokit.repos.getContent(Object.assign({
      owner,
      repo,
      path,
    }, !!branch ? {ref: branch} : {}))
  } catch (e) {
    file = null
    if (e.status !== 404) {
      throw e
    }
  }

  return await octokit.repos.createOrUpdateFileContents(Object.assign({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    sha: file ? file.data.sha : null,
  }, !!branch ? {branch} : {}))
}
