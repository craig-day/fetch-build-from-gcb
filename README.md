# Fetch Build from GCB

A Github action to fetch a given build from GCB and extract the docker digest of a target image.

## Inputs

- `build_url` **Required** The link to the GCB build so we can extract the build ID.
- `target_image` **Required** The name of the image to find the digest for.

## Output

- `digest` The SHA256 docker digest of the image.

## Setup

This action uses a Google Cloud service account to fetch build information from the API. To use it
in your workflow you need to do the following things:

1. Have the service account credentials file available as a repository secret.

1. Dump the contents of that secret to a file. This is required by the `google-auth-library` package.

    ```yaml
    - name: initialize credentials
      run: |
        mkdir -p ./secrets
        echo $GOOGLE_APPLICATION_CREDENTIALS > ./secrets/GOOGLE_APPLICATION_CREDENTIALS
      env:
        GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }}
    ```

1. Set the location of that secrets file in the `GOOGLE_APPLICATION_CREDENTIALS` environment
   variable when running this action.

    ```yaml
    - id: find_digest
      uses: craig-day/fetch-build-from-gcb@v1
      with:
        build_url: ${{ github.event.path-to-build-url }}
        target_image: my-app
      env:
        GOOGLE_APPLICATION_CREDENTIALS: ./secrets/GOOGLE_APPLICATION_CREDENTIALS
    ```

## Usage

### With a repo mirrored to GCR and gets `status` GCB webhooks

If your repository is mirrored into GCR and the build information appears on your repository with
a PR status from `docker-images-180022`, then you need to have your workflow response to `status`
events.

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
    - name: initialize credentials
      run: |
        mkdir -p ./secrets
        echo $GOOGLE_APPLICATION_CREDENTIALS > ./secrets/GOOGLE_APPLICATION_CREDENTIALS
      env:
        GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }}

    - id: find_digest
      uses: craig-day/fetch-build-from-gcb@v1
      with:
        build_url: ${{ github.event.target_url }}
        target_image: my-app
      env:
        GOOGLE_APPLICATION_CREDENTIALS: ./secrets/GOOGLE_APPLICATION_CREDENTIALS

    - name: cleanup credentials
      run: rm -rf ./secrets

    - name: Something that uses the digest
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
    - name: initialize credentials
      run: |
        mkdir -p ./secrets
        echo $GOOGLE_APPLICATION_CREDENTIALS > ./secrets/GOOGLE_APPLICATION_CREDENTIALS
      env:
        GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }}

    - id: find_digest
      uses: craig-day/fetch-build-from-gcb@v1
      with:
        build_url: ${{ github.event.check_run.details_url }}
        target_image: fun-app
      env:
        GOOGLE_APPLICATION_CREDENTIALS: ./secrets/GOOGLE_APPLICATION_CREDENTIALS

    - name: cleanup credentials
      run: rm -rf ./secrets

    - name: Something that uses the digest
      env:
        IMAGE_DIGEST: ${{ steps.find_digest.outputs.digest }}
```
