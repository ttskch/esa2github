# esa2github

[Vercel.com](https://vercel.com) ready [esa](https://esa.io/) webhook handler to commit markdown file to GitHub.  

## Installation

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/ttskch/esa2github&import=1)

```bash
$ npm i -g vercel
```

```bash
$ vercel env add GITHUB_OWNER production # and set owner
$ vercel env add GITHUB_REPO production # and set repo
$ vercel env add GITHUB_PATH production # and set paht/to/dir
$ vercel env add GITHUB_FILENAME_BY_TITLE production # and set "yes" if want to use post number as filename
$ vercel env add ESA_DISABLE_DEFAULT_FRONTMATTER production # and set "yes" if want to prepend default frontmatter
$ vercel secrets add github-access-token {your_secret}
$ vercel secrets add esa-secret {your_secret}
```

## Usage

1. Create [Generic Webhook](https://docs.esa.io/posts/37) on your esa team
1. Create or update some posts
1. That's it!

### Prepending your own frontmatter

You can prepend your own frontmatter to posts👍

If the post has following contents:

```
blog/2020-05-01
```

    ```
    ---
    title: Hello, esa2github
    tags:
      - esa
      - github
    date: 2020-05-01
    ---
    ```
    
    ## Hello

Then esa2github creates markdown file like:

```
---
title: Hello, esa2github
category: blog
tags:
  - esa
  - github
published: true
number: 123
date: 2020-05-01
---

## Hello
```

Or if `ESA_DISABLE_DEFAULT_FRONTMATTER` is true, like:

```
---
title: Hello, esa2github
tags:
  - esa
  - github
date: 2020-05-01
---

## Hello
```

### Reserving commitment

You can reserve to commit and push to GitHub each posts👍

First, tell esa2github the MongoDB URI. (Using [MongoDB Atlas](https://www.mongodb.com/cloud) is maybe reasonable for you)

```bash
$ vercel secrets add mongodb-uri mongodb://xxx
```

And add `commitAt` property with string value which is acceptable by [dayjs](https://github.com/iamkun/dayjs) to frontmatter of the post.

    ```
    ---
    commitAt: 2020-05-02 18:00:00 +0900
    ---
    ```

Enjoy!
