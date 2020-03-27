const core = require('@actions/core')
const { GoogleAuth } = require('google-auth-library')

function buildId() {
  const url = new URL(core.getInput('build_url'))

  return url.pathname.split('/').pop()
}

async function fetchBuild(buildId) {
  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  })

  const client = await auth.getClient()
  const projectId = await auth.getProjectId()

  const response = await client.request({
    url: `https://cloudbuild.googleapis.com/v1/projects/${projectId}/builds/${buildId}`,
  })

  const targetImage = core.getInput('target_image')
  const build = response.data

  if (build.status.toUpperCase() != 'SUCCESS') {
    core.setFailed(`Build ${build.id} was not successful`)
    return
  } else {
    const image = build.results.images.find(image =>
      image.name.split(':', 2)[0].endsWith(targetImage)
    )

    if (!image) {
      core.setFailed(`Failed to find image matching ${targetImage}`)
      return
    }

    return image.digest
  }
}

async function run() {
  const digest = await fetchBuild(buildId())

  core.setOutput('digest', digest)
}

try {
  run()
} catch (error) {
  core.setFailed(`Action failed with error ${error}`)
}
