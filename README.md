# esa2github

## esa2githubとは

[esa](https://esa.io/) で書いたMarkdownファイルをGitHubに自動でpushするための [Generic Webhook](https://docs.esa.io/posts/37) ハンドラーアプリケーションです。

以下のような特長があります。

* Frontmatterを付加しないようにできる
* Frontmatterの内容を記事ごとに自由に書ける
  * これにより、Gatsby、Hugo、VuePressなど任意の静的サイトジェネレータと併用できる
* 指定した日時にGitHubにコミットがpushされるように予約できる
* ワンクリックでHerokuにデプロイしてすぐに使い始められる

## インストール方法

### Herokuへのデプロイ

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/ttskch/esa2github)

このボタンを押すと、下図のような画面が開いて、あなたのHerokuアカウントにesa2githubをデプロイできます。

<img src="https://user-images.githubusercontent.com/4360663/182005488-381e5ffe-367a-435a-a7c6-e274c562c2a4.png" width="50%">

> 無料枠で利用可能ですが、Heroku Addonを使用するためクレジットカード情報の登録が必須となります。

環境変数の設定内容については [#環境変数](#環境変数) をご参照ください。

デプロイが完了すると、`https://{アプリ名}.herokuapp.com` にてWebhookハンドラーが利用できるようになります👍

### セルフホスティング

```bash
$ git clone git@github.com:ttskch/esa2github.git
$ cd esa2github
$ npm i
$ npm start
$ npm run ngrok # 開発環境向けです。本番環境では適宜Webサーバーを用意してください。
```

> [#予約投稿機能](#予約投稿機能) を使用する場合は、これに加えて以下のようにワーカーを起動し、
> 
> ```bash
> $ npm run worker
> ```
> 
> `REDIS_URL` 環境変数にRedisサーバーのURLを設定する必要があります。

これで、`https://xxxxxxxx.ngrok.io` にてWebhookハンドラーが利用できるようになります👍

ただし、[ngrok](https://ngrok.com/) は本番環境で利用すべきではないので、本番環境では適宜Webサーバーを用意してください。

## 環境変数

各種設定は環境変数にて行います。環境変数の意味は以下のとおりです。

| 環境変数 | 意味 | 必須/任意 | 設定値の例 |
| --- | --- | --- | --- |
| `GITHUB_OWNER` | 保存先GitHubリポジトリのオーナー名 | 必須 | `ttskch` |
| `GITHUB_REPO` | 保存先GitHubリポジトリのリポジトリ名 | 必須 | `zenn-content` |
| `GITHUB_BRANCH` | 保存先GitHubリポジトリのブランチ名 |  | （空欄にするとデフォルトブランチが使われます） |
| `GITHUB_BASE_PATH` | 保存先ディレクトリへのパス |  | `articles` （空欄にするとルートに保存されます） |
| `GITHUB_FILENAME_BY_TITLE` | 保存時のファイル名に投稿タイトルを使うか |  | `yes` （空欄にすると投稿IDが使われます） |
| `GITHUB_ACCESS_TOKEN` | GitHubのPersonal Access Token（[ここで作成](https://github.com/settings/tokens)） | 必須 |  |
| `ESA_DISABLE_DEFAULT_FRONTMATTER` | 作成されるファイルにデフォルトのFrontmatterを付与しなくする |  | `yes` |
| `ESA_SECRET` | esaのGeneric Webhookにsecretが設定されている場合はその値 |  |  |
| `REDIS_URL` | 予約投稿機能を使う場合はRedisサーバーのURL |  | `redis://127.0.0.1:6379` |

## 使い方

`https://{チーム名}.esa.io/team/webhooks` を開いて、`Webhookを追加` ボタンから `Generic` を選択して設定を作成します。

設定内容は例えば以下のような感じです。

<img src="https://user-images.githubusercontent.com/4360663/182005923-a39e5deb-1f10-4955-a278-0c4c8d55250f.png" width="50%">

あとは、Generic Webhookの対象としたカテゴリ配下に記事を作成または更新すれば、Webhook経由でGitHubにMarkdownファイルがpushされます👍

### Frontmatterを自由に記述する

[標準のGitHub Webhook](https://docs.esa.io/posts/176) では、作成されるMarkdownファイルの先頭に自動で一定のFrontmatterが付加されます。

> 具体的には、[記事のURLに `.md` を付けたとき](https://docs.esa.io/posts/176.md) と同じ内容でファイルが作成されます。

esa2githubでもこれに合わせて、デフォルトでは以下のようなFrontmatterが付加されます。

```
---
title: "タイトル"
category: path/to/category
tags:
  - タグ1
  - タグ2
published: true
number: 123
---
```

> `created_at` `updated_at` の2つはGeneric Webhookでは取得されませんでした。

これに加えて、以下のように記事本文の先頭のコードブロックにFrontmatterを書けば、それがFrontmatterとしてマージされます。

````
```
---
title: "上書きタイトル"
date: 2020-05-20
---
```

本文
````

この場合、上記2つのFrontmatterはマージされて最終的なファイル内容は以下のようになります。

```
---
title: "上書きタイトル"
category: path/to/category
tags:
  - タグ1
  - タグ2
published: true
number: 123
date: 2020-05-20
---

本文
```

また、`ESA_DISABLE_DEFAULT_FRONTMATTER` 環境変数に [Truthy](https://developer.mozilla.org/ja/docs/Glossary/Truthy) な値をセットしておくことで、デフォルトのFrontmatterを完全に無効にすることもできます。

先ほどの例で言うと、`ESA_DISABLE_DEFAULT_FRONTMATTER` が `true` だった場合は、最終的なファイル内容はシンプルに以下のとおりになります。

```
---
title: "上書きタイトル"
date: 2020-05-20
---

本文
```

`ESA_DISABLE_DEFAULT_FRONTMATTER` が `true` で、かつ本文先頭にFrontmatterの記載がない場合は、最終的なファイル内容は以下のように本文のみになります。

```
本文
```

### 予約投稿機能

本文先頭のFrontmatterの `commitAt` という項目で日時を指定することで、予約投稿を行うことができます。

````
```
---
commitAt: 2020-05-02 18:00:00 +0900
---
```
````

これが書かれた記事のWebhookを受け取った場合、即座にcommit&pushはされず、指定された日時（誤差最大1分）にスケジューリングされます。

> ちなみに、指定された日時がすでに過去だった場合は結果的に即座にコミットされます。

日時を表す文字列のパースには [dayjs](https://github.com/iamkun/dayjs) を使っているので、dayjsが正常に解釈できる表記なら何でも指定可能です。

### Herokuの無料プランで予約投稿機能を使う場合の注意点

esa2githubでは、予約投稿機能の実現のため、Herokuの [Worker Dyno](https://devcenter.heroku.com/articles/background-jobs-queueing) を [ONにしています](https://github.com/ttskch/esa2github/blob/master/app.json#L12-L15)。

2020/05/21時点で [こちらのドキュメント](https://devcenter.heroku.com/articles/free-dyno-hours#dyno-sleeping) に

> Worker dynos do not sleep, because they do not respond to web requests. Be mindful of this as they may run 24/7 and consume from your pool of hours.

という記述があり、Worker DynoはWeb Dynoと違って30分放置してもスリープしないっぽく見えるのですが、Herokuの中の人にTwitterで質問してみたところ、**Web Dynoがスリープするときは他のDynoも巻き込む仕様** [とのことでした](https://twitter.com/herokujp/status/1263379997294657536)。

なので無料プランだと、最後にWebhookにアクセスがあってから30分で予約投稿のキューを処理するWorker Dynoがスリープしてしまって、予約時刻になってもキューが処理されず期待どおりに動作しません。

> 次にWebhookにアクセスがあったタイミング（esaで何かしら記事をShipItしたタイミング）でWeb Dynoと一緒にWorker Dynoも再起動して、そこで溜まっていたキューが一気に処理されるような動作になります。

これを防ぐため、esa2githubはデフォルトで [Heroku Scheduler](https://devcenter.heroku.com/articles/scheduler) をインストールします。

例えばブログ記事のように投稿時刻が毎日朝9:00や夕方18:00などとと決まっているような場合であれば、Heroku Schedulerを使って毎日その直前の時刻にWeb Dyno（とWorker Dyno）を起こしてあげるようにしておくと、一応解決することができます。

毎日夕方17:30（JST）にWeb Dynoを起こすには、以下のようなジョブを登録しておけばよいです。

<img src="https://tva1.sinaimg.cn/large/007S8ZIlgy1gf060e3xpsj30ky0io40a.jpg" width="50%">

> Heroku Schedulerからcurlで定期的にアクセスすることでWeb DynoをスリープさせないというハックはHerokuユーザーの間ではよく知られています。

なお、Web DynoもWorker Dynoもスリープしていない時間は当然に [Free Dyno Hours](https://devcenter.heroku.com/articles/free-dyno-hours) を消費するので、このように定期的に起こすのは無料枠の消費を早めます。

なので、もし予約投稿機能を使わないなら、Heroku Schedulerも使わず、Worker Dyno自体もOFFにしておくとよいでしょう。

![](https://tva1.sinaimg.cn/large/007S8ZIlgy1gez5gmzb5nj31wc0dg40a.jpg)
