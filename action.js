const core = require('@actions/core')
const { GoogleAuth } = require('google-auth-library')
const process = require('process')
const fs = require('fs')

function payload() {
  try {
    return JSON.parse(fs.readFileSync(process.env['GITHUB_EVENT_PATH']))
  } catch (error) {
    core.setFailed(`Failed to read event payload: ${error}`)
  }
}

function buildUrl() {
  const event = payload()

  switch (process.env['GITHUB_EVENT_NAME']) {
    case 'check_run':
      return event.check_run.details_url
    case 'status':
      return event.target_url
    default:
      core.setFailed(
        'Failed to extract build URL from event payload. Is this not a GCB event?'
      )
  }
}

function buildId() {
  const url = new URL(buildUrl())

  return url.pathname.split('/').pop()
}

async function fetchDigest() {
  const creds = JSON.parse(
    core.getInput('google_application_credentials', { required: true })
  )

  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  })

  const client = auth.fromJSON(creds)
  const url = `https://cloudbuild.googleapis.com/v1/projects/${
    creds.project_id
  }/builds/${buildId()}`

  const response = await client.request({ url })

  const targetImage = core.getInput('target_image', { required: true })
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
  const event = payload()
  let isGCB

  switch (process.env['GITHUB_EVENT_NAME']) {
    case 'check_run':
      isGCB = event.check_run.app.name.toLowerCase() == 'google cloud build'
      break
    case 'check_suite':
      isGCB = event.check_suite.app.name.toLowerCase() == 'google cloud build'
      break
    case 'status':
      isGCB = /gcb build/i.test(event.description)
      break
    default:
      isGCB = false
  }

  if (isGCB) {
    core.setOutput('digest', await fetchDigest())
  } else {
    core.warning('Event does not appear to be from GCB, ignoring')
  }
}

try {
  run()
} catch (error) {
  core.setFailed(`Action failed with error ${error}`)
}
