# Fetch Build from GCB

![Latest Release](https://img.shields.io/github/v/release/craig-day/fetch-build-from-gcb?label=Latest%20Release)

A Github action to fetch a given build from GCB and extract the docker digest of a target image.

## Inputs

| Parameter                        | Description                                               | Required | Default |
| -------------------------------- | --------------------------------------------------------- | -------- | ------- |
| `target_image`                   | The name of the image to find the digest for              | Y        | N/A     |
| `google_application_credentials` | Service account credentials for your Google Cloud project | Y        | N/A     |

## Output

The action will automatically inspect the event payload and only set the output on when a successful
GCB build has been found and parsed. It will however, still "succeed" as long as the event is valid,
but it will not set the `digest` output. **For this reason, it is highly recommended that you guard
the job with the `if` condition found in the appropriate example below.**

- `digest` The SHA256 docker digest of the image.

## Usage

This action uses a Google Cloud service account to fetch build information from the API.

### With a repo mirrored to GCR and gets `status` GCB webhooks

If your repository is mirrored into GCR and the build information appears on your repository with
a PR status from `my-project-1234`, then you need to have your workflow response to `status` events.

If your build creates an image tagged as `my-app:{commit_sha}`, then your workflow might look like
this:

```yaml
on: status

jobs:
  find_digest:
    runs-on: ubuntu-latest
    if: |
      github.event.state == 'success' &&
        contains(github.event.description, 'GCB build')
  steps:
    - id: find_digest
      uses: craig-day/fetch-build-from-gcb@v3
      with:
        target_image: my-app
        google_application_credentials: ${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }}

    - name: Something that uses the digest
      run: echo $IMAGE_DIGEST
      env:
        IMAGE_DIGEST: ${{ steps.find_digest.outputs.digest }}
```

### With a repo connected to the GCB app and gets GCB `check_run`s

If your repository is connected to the GCB app and the build information appears on your repository
with a PR status from `Google Cloud Build`, then you need to have your workflow response to
`check_run` events.

If your build creates an image tagged as `fun-app:{git_tag}`, then your workflow might include steps
that look like this:

```yaml
on:
  check_run:
    types:
      - completed

jobs:
  from_gcb_check_run:
    runs-on: ubuntu-latest
    if: |
      github.event.check_run.app.name == 'Google Cloud Build' &&
        github.event.check_run.conclusion == 'success'
  steps:
    - id: find_digest
      uses: craig-day/fetch-build-from-gcb@v3
      with:
        target_image: fun-app
        google_application_credentials: ${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }}

    - name: Something that uses the digest
      run: echo $IMAGE_DIGEST
      env:
        IMAGE_DIGEST: ${{ steps.find_digest.outputs.digest }}
```
