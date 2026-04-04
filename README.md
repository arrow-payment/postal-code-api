# 郵便番号 API

この郵便番号APIはmadefor様により作成されたレポジトリを引き継いだものになります。

GitHubページを使用して静的なファイルで配信しているため信頼性が高く、さらにオープンソースなのでクライアントワークでも安心して使用できます。

また、郵便番号から英語の住所を取得することも可能です。（大口事業所個別番号は英語には対応していません。）

なお、このAPIはGitHub Actionsを使用して毎日更新しています。

## デモ
https://arrow-payment.github.io/postal-code-api/

## エンドポイント

```
https://arrow-payment.github.io/postal-code-api/api/v2/
```

## 使い方

郵便番号が`100-0014`(東京都千代田区永田町)の住所を取得したい場合。

https://arrow-payment.github.io/postal-code-api/api/v2/100/0014.json

```json
{
  "code":"1000014",
  "data":[
    {
      "prefcode":"13",
      "ja":{
        "prefecture":"東京都",
        "address1":"千代田区",
        "address2":"永田町",
        "address3":"",
        "address4":""
      },
      "ja_kana":{
        "prefecture":"ﾄｳｷｮｳﾄ",
        "address1":"ﾁﾖﾀﾞｸ",
        "address2":"ﾅｶﾞﾀﾁｮｳ",
        "address3":"",
        "address4":""
      },
      "en":{
        "prefecture":"Tokyo",
        "address1":"Chiyoda-ku",
        "address2":"Nagatacho",
        "address3":"",
        "address4":""
      }
    }
  ]
}
```

1つの郵便番号に複数の住所がある場合は以下のような感じです。

https://arrow-payment.github.io/postal-code-api/api/v2/618/0000.json

```json
{
  "code":"6180000",
  "data":[
    {
      "prefcode":"26",
      "ja":{
        "prefecture":"京都府",
        "address1":"乙訓郡大山崎町",
        "address2":"",
        "address3":"",
        "address4":""
      },
      "ja_kana":{
        "prefecture":"ｷｮｳﾄﾌ",
        "address1":"ｵﾄｸﾆｸﾞﾝｵｵﾔﾏｻﾞｷﾁｮｳ",
        "address2":"",
        "address3":"",
        "address4":""
      },
      "en":{
        "prefecture":"Kyoto",
        "address1":"Oyamazaki-cho, Otokuni-gun",
        "address2":"",
        "address3":"",
        "address4":""
      }
    },
    {
      "prefcode":"27",
      "ja":{
        "prefecture":"大阪府",
        "address1":"三島郡島本町",
        "address2":"",
        "address3":"",
        "address4":""
      },
      "ja_kana":{
        "prefecture":"ｵｵｻｶﾌ",
        "address1":"ﾐｼﾏｸﾞﾝｼﾏﾓﾄﾁｮｳ",
        "address2":"",
        "address3":"",
        "address4":""
      },
      "en":{
        "prefecture":"Osaka",
        "address1":"Shimamoto-cho, Mishima-gun",
        "address2":"",
        "address3":"",
        "address4":""
      }
    }
  ]
}
```

大口事業所個別番号では英語の事業所名は空になっています。
また、番地の読み仮名は提供されないため空欄になっています。

https://arrow-payment.github.io/postal-code-api/api/v2/100/8791.json

```json
{
  "code":"1008791",
  "data":[
    {
      "prefcode":"13",
      "ja":{
        "prefecture":"東京都",
        "address1":"千代田区",
        "address2":"大手町",
        "address3":"２－３－１",
        "address4":"日本郵政　株式会社"
      },
      "ja_kana":{
        "prefecture":"ﾄｳｷｮｳﾄ",
        "address1":"ﾁﾖﾀﾞｸ",
        "address2":"ｵｵﾃﾏﾁ",
        "address3":"",
        "address4":"ﾆﾂﾎﾟﾝﾕｳｾｲ ｶﾌﾞｼｷｶﾞｲｼﾔ"
      },
      "en":{
        "prefecture":"Tokyo",
        "address1":"Chiyoda-ku",
        "address2":"Otemachi",
        "address3":"",
        "address4":""
      }
    }
  ]
}
```

## 逆引きAPI（住所から郵便番号を検索）

v2では、住所から郵便番号を検索する逆引きAPIも提供しています。大口事業所個別番号は対象外です。

### 基本的な使い方

町域名まで指定する場合:

https://arrow-payment.github.io/postal-code-api/api/v2/東京都/品川区/旗の台.json

市区町村まで指定する場合:

https://arrow-payment.github.io/postal-code-api/api/v2/東京都/品川区.json

レスポンスは郵便番号APIと同じ形式です。

### 町域名の特殊ケース

元データの町域名にはカッコ付きの補足情報が含まれることがあり、逆引きパスでは以下のルールで正規化されます。

| 元データの例 | 逆引きパス | ルール |
|---|---|---|
| `宮島町（大町）` | `広島県/廿日市市/宮島町大町.json` | カッコを外して中身をくっつける |
| `上野（A、B）` | `…/上野A.json` と `…/上野B.json` | 「、」区切りで分配展開 |
| `○○（１〜３丁目）` | `…/○○.json` | 「〜」を含むカッコは削除 |
| `○○（その他）` | `…/○○.json` | 「（その他）」は削除 |

### 汎用エントリの扱い

「以下に掲載がない場合」に該当する郵便番号は、町域名が空になるため市区町村レベルのエントリ（`都道府県/市区町村.json`）として生成されます。

例: 郵便番号`8110000`（福岡県福津市・以下に掲載がない場合）の逆引き:

https://arrow-payment.github.io/postal-code-api/api/v2/福岡県/福津市.json

一方、「（その他）」や「○○の次に番地がくる場合」に該当する郵便番号は、市区町村レベルとの重複を回避するため、市区町村名を町域名として使用します。

例: 郵便番号`8114146`（福岡県宗像市・宗像市の次に番地がくる場合）の逆引き:

https://arrow-payment.github.io/postal-code-api/api/v2/福岡県/宗像市/宗像市.json

同じパスに複数の郵便番号が該当しうる場合、「（その他）」「○○の次に番地がくる場合」由来のエントリが優先的に保持されます。

## 仕様

* 大口事業所個別番号データは英語には対応していません。
* Gulpタスクで以下の処理を行っています。
  1. [日本郵便のウェブサイト](http://www.post.japanpost.jp/zipcode/)から[郵便番号データ](https://www.post.japanpost.jp/zipcode/dl/kogaki-zip.html)をダウンロード。
  2. ダウンロードしたファイルを解凍して、取り出したCSVをパース。
  3. 郵便番号の上3桁の名前を持つディレクトリを作り、その中に下4桁の名前を持つJSONを作成。
* GitHub Actionsを使用して毎日更新しています
* 互換性維持のため、v1も引き続きメンテナンスされますが以下の理由のためv2への移行を推奨します
  * v1のデータソースであるローマ字表記CSVデータは年に1回程度しか更新されません
  * v1には読み仮名が含まれません

## ローカルでJSONデータを作成する

このリポジトリをcloneしてください。

```
$ git@github.com:arrow-payment/postal-code-api.git
```

必要なモジュールをインストールしてください。

```
$ cd postal-code-api
$ npm install
```

以下のコマンドでAPIを生成してください。

```
$ npm run build
```

ローカルでAPIを動かしたい場合には以下のコマンドを実行してください。

```
$ npm start
```

## 貢献

* バグレポートは[Issue](https://github.com/arrow-payment/postal-code-api/issues)にお願いします。
* プルリクエストは大歓迎です。
* Starをつけてもらうと開発者たちのモチベーションが上がります。
* ぜひオリジナルのレポジトリ(madefor/postal-code-api)のほうにもStarをお願いします

## ライセンス

MIT
(弊社変更部分についてはPublic Domainとします。madefor様のライセンス表記は引き続き必要です)
