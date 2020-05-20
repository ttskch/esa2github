# esa2github

Heroku ready [esa](https://esa.io/) webhook handler to commit markdown file to GitHub which has following features:

* **Can modify frontmatter** flexibly so that you can manage contents for some static site generators like Gatsby, Hugo or VuePress
* **Can schedule to commit and push** to GitHub

## Installation

### Using Heroku

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/ttskch/esa2github)

Just deploy this app to your heroku as follows.

<img src="https://user-images.githubusercontent.com/4360663/82407879-49672800-9aa5-11ea-954e-a06a02e7501f.png" width="50%">

> Credit card has to be added to your heroku account because this app uses addon. But you can use them totally free. 

Now your webhook is deployed on `https://{app_name}.herokuapp.com` 👍

### Hosting by yourself

```bash
$ git clone git@github.com:ttskch/esa2github.git
$ cd esa2github
$ npm i
$ npm start
$ npm run ngrok # !!only for dev!!
```

Now your webhook is deployed on `https://xxxxxxxx.ngrok.io` 👍 But of course you MUST NOT use [ngrok](https://ngrok.com/) for production.

## Usage

1. Create [Generic Webhook](https://docs.esa.io/posts/37) on your esa team as follows<br><img src="https://user-images.githubusercontent.com/4360663/82407645-b201d500-9aa4-11ea-8d79-1d7914015099.png" width="50%">
1. Create or update some posts on esa
1. Your GitHub repository will be updated 🎉

### Prepending your own frontmatter

You can prepend your own frontmatter to posts 🎉

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

### Scheduling commitment

You can schedule to commit and push to GitHub for each posts 🎉

To do it, just add `commitAt` property with string value which is acceptable by [dayjs](https://github.com/iamkun/dayjs) to frontmatter of the post.

    ```
    ---
    commitAt: 2020-05-02 18:00:00 +0900
    ---
    ```

#### If you're hosting by yourself

You have to do just two things before.

1. Set `MONGODB_URI` envvar like as follows:
    ```
    MONGODB_URI=mongodb://{user}:{password}@{host}:{port}/{db}
    ````
1. Run worker process as follows:
    ```bash
    $ npm run worker
    ```

> Using [MongoDB Atlas](https://www.mongodb.com/cloud) is maybe reasonable for you 👍

Enjoy!
