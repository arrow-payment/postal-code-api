/**
 * v2 api json生成プログラム
 * Author: grainrigi
 */

const csv = require('comma-separated-values');
const fs = require('fs');
const path = require('path');
const gutil = require('gulp-util');
const through = require('through2');
const prefcodes = require('./prefs.json');


// カナ・ローマ字・事業所すべてを一括で統合する
// (ローマ字のデータは最新ではないため、かなのデータをベースとしてローマ字表記を挿入する必要がある)
// (事業所番号に事業所名以外のカナを入れるにはカナのデータが必要であるため、分離できない)
module.exports = function () {
  const transform = function (file, enc, callback) {
    const kanas = mergeConsecutiveRecords(parseCsvSync('KEN_ALL.CSV', 15));
    const romes = parseCsvSync('KEN_ALL_ROME.CSV', 7);
    const jigyos = parseCsvSync('JIGYOSYO.CSV', 13);

    const codes = { // 郵便番号データ(最終型)
      // '1000001': {
      //    APIのJSONと同じ形式のもの
      // },
      // ...
    };
    const jsons = { // 重複データ確認用(キーに郵便番号+JSON化したdataを格納)
      // '1000000{"prefcode":.....}': true,
    }
    const reverseMap = { // 逆引きデータ(住所パス → 郵便番号)
      // '東京都/品川区/旗の台': '1420064',
      // '東京都/品川区': '1400000',
      // ...
    };
    const reverseProtected = { // 逆引きエントリが上書き不可か(「その他」「次に番地がくる場合」由来の汎用エントリ)
    };
    const yomis = { // よみがなデータ(事業所データ変換時に使用)
      // '東京都': ['トウキョウト', 'Tokyo-to',
      // '東京都千代田区': ['チヨダク', 'Chiyoda-ku',
      // '東京都千代田区千代田': ['チヨダ', 'Chiyoda'],
      // ...
    };

    // 郵便番号データを追加する関数
    function addCodeData(code, data) {
      // 重複チェック
      const json = code + JSON.stringify(data);
      if (jsons[json]) return;
      jsons[json] = true;

      // 追加
      if (codes[code]) {
        codes[code].data.push(data);
      } else {
        codes[code] = {
          'code': code,
          data: [data],
        };
      }
    }

    // まずはかなデータをパース(ローマ字のデータのほうが古いのと、事業所用のよみデータを構築するため)
    for (const line of kanas) {
      const code = line[2];
      const yomipref = line[3]; // 都道府県名ｶﾅ
      const yomi1 = line[4]; // 市区町村名ｶﾅ
      const yomi2 = trimAddr2(line[5]); // 町域名ｶﾅ
      const pref = line[6];  // 都道府県名
      const addr1 = line[7]; // 市区町村名
      const addr2 = trimAddr2(line[8]); // 町域名

      addCodeData(code, {
        'prefcode': pref2code(pref),
        'ja': {
          'prefecture': pref,
          'address1': addr1,
          'address2': addr2,
          'address3': '',
          'address4': '',
        },
        'ja_kana': {
          'prefecture': yomipref,
          'address1': yomi1,
          'address2': yomi2,
          'address3': '',
          'address4': '',
        },
        'en': {
          'prefecture': '',
          'address1': '',
          'address2': '',
          'address3': '',
          'address4': '',
        },
      });

      yomis[pref] = [yomipref, ''];
      yomis[pref+addr1] = [yomi1, ''];
      yomis[pref+addr1+addr2] = [addr2 ? yomi2 : '', ''];

      // 逆引きマップ構築(大口事業所以外)
      const rawAddr2 = line[8];
      const reverseAddr2List = normalizeAddr2ForReverse(rawAddr2);
      const isGeneric = /（その他）/.test(rawAddr2) || /次に番地がくる場合/.test(rawAddr2);
      for (const reverseAddr2 of reverseAddr2List) {
        // genericで正規化後addr2が空の場合、pref/addr1/addr1にして市区町村レベルとの重複を回避
        const addrKey = (reverseAddr2 || isGeneric)
          ? pref + '/' + addr1 + '/' + (reverseAddr2 || addr1)
          : pref + '/' + addr1;
        if (reverseMap[addrKey] && reverseMap[addrKey] !== code) {
          if (reverseProtected[addrKey]) {
            console.log('WARNING: reverse lookup path conflict (skipped):', addrKey, '→', reverseMap[addrKey], 'and', code, '(' + rawAddr2 + ')');
          } else {
            console.log('WARNING: reverse lookup path conflict (overwritten):', addrKey, '→', reverseMap[addrKey], 'to', code, '(' + rawAddr2 + ')');
            reverseMap[addrKey] = code;
          }
        } else {
          reverseMap[addrKey] = code;
        }
        if (isGeneric) reverseProtected[addrKey] = true;
      }
    }

    // ローマ字表記データを構築
    for (const rome of romes) {
      const code = rome[0];
      const jpref = rome[1];
      const jaddr1 = rome[2].replace(/　/g, '');
      const jaddr2 = trimAddr2(rome[3]).replace(/　/g, '');
      const pref = removeSuffix(rome[4]).capitalize();
      const addr1 = combineSuffix(rome[5]).capitalize();
      const addr2 = combineSuffix(trimAddr2(rome[6])).capitalize();

      if (!codes[code]) continue; // 廃止された番号はつかわない

      if (yomis[jpref]) yomis[jpref][1] = pref;
      if (yomis[jpref+jaddr1]) yomis[jpref+jaddr1][1] = addr1;
      if (yomis[jpref+jaddr1+jaddr2]) yomis[jpref+jaddr1+jaddr2][1] = addr2;
    }

    // ローマ字表記データを挿入
    for (const code in codes) {
      const data = codes[code].data;
      for (const d of data) {
        const pref = d.ja.prefecture;
        const addr1 = d.ja.address1;
        const addr2 = d.ja.address2;

        d.en.prefecture = yomis[pref][1];
        d.en.address1 = yomis[pref+addr1][1];
        if (addr2) d.en.address2 = yomis[pref+addr1+addr2][1];
      }
    }

    // 大口事業所個別番号を追加
    for (const jigyo of jigyos) {
      const yomi4 = jigyo[1];
      const addr4 = jigyo[2]; // 事業所名
      const pref = jigyo[3];
      const addr1 = jigyo[4];
      const addr2 = jigyo[5];
      const addr3 = jigyo[6]; // 番地
      const code = jigyo[7];

      const [yomipref, eyomipref] = yomis[pref] ?? ['', ''];
      const [yomi1, eyomi1] = yomis[pref+addr1] ?? ['', ''];
      const [yomi2, eyomi2] = yomis[pref+addr1+(addr2 || ' ')] ?? ['', ''];

      addCodeData(code, {
        'prefcode': pref2code(pref),
        'ja': {
          'prefecture': pref,
          'address1': addr1,
          'address2': addr2,
          'address3': addr3,
          'address4': addr4,
        },
        'ja_kana': {
          'prefecture': yomipref,
          'address1': yomi1,
          'address2': yomi2,
          'address3': '', // 番地のよみは諦め
          'address4': yomi4,
        },
        'en': {
          'prefecture': eyomipref,
          'address1': eyomi1,
          'address2': eyomi2,
          'address3': '',
          'address4': '',
        },
      });
    }

    for (const code in codes) {
      const file = new gutil.File( {
        cwd: __dirname,
        path: path.join( __dirname, code.substring(0, 3),
                  code.substring(3, 7) + '.json' ),
        contents: Buffer.from( JSON.stringify( codes[code] ) + "\n" )
      } );
      this.push(file);
    }

    // 逆引きファイルを生成
    for (const addrPath in reverseMap) {
      const code = reverseMap[addrPath];
      if (!codes[code]) continue;
      const file = new gutil.File( {
        cwd: __dirname,
        path: path.join( __dirname, addrPath + '.json' ),
        contents: Buffer.from( JSON.stringify( codes[code] ) + "\n" )
      } );
      this.push(file);
    }

    return callback();
  };

  return through.obj(transform);
}

// addr2に未閉じの（がある連続レコードを結合して1レコードにまとめる
function mergeConsecutiveRecords(records) {
  const merged = [];
  for (let i = 0; i < records.length; i++) {
    const line = records[i].slice(); // コピー
    // addr2に（があり）で閉じていない場合、後続レコードを結合
    while (hasUnclosedParen(line[8]) && i + 1 < records.length) {
      i++;
      line[5] += records[i][5]; // カナaddr2を結合
      line[8] += records[i][8]; // addr2を結合
    }
    merged.push(line);
  }
  return merged;
}

// 文字列中の（が）で閉じられていないかを判定
function hasUnclosedParen(str) {
  let depth = 0;
  for (const ch of str) {
    if (ch === '（') depth++;
    else if (ch === '）') depth--;
  }
  return depth > 0;
}

const API_DIR = path.resolve(__dirname, '../api');

// ../api以下にあるCSVファイルをパースして返す
function parseCsvSync(name, columns) {
  const csvStr = fs.readFileSync(path.join(API_DIR, name), 'utf-8');
  return new csv(csvStr, {
    cast: new Array(columns).fill('String'),
  }).parse();
}

// 町域名から余計な要素を取り除く
function trimAddr2(addr) {
  const trimmed = addr
    .replace(/[（(].*$/, '') // カッコで囲われた但し書きを削除(丁目、〜を除く、○階、等)
    .replace(/.+(一円|ｲﾁｴﾝ|ICHIEN)$/, '') // 「○○一円」は削除(滋賀県犬上郡多賀町一円があるので完全一致は消さない)
    .replace(/.*(場合|ﾊﾞｱｲ|BAAI)$/, '') // 「以下に掲載がない場合(町域不定番号)」と「〜の次に番地がくる場合(町域欄に番地がくる番号)」の但し書きを削除
    .trim();
  return trimmed;
}

// 逆引きパス用の町域名正規化(配列を返す)
// trimAddr2はカッコ以降を全て削除するが、逆引きでは以下のルールで処理する:
//   （その他）→ 削除
//   （A〜B）  → 削除(丁目範囲等)
//   （A、B）  → 分配展開(「町域名A」「町域名B」の2エントリ)
//   （大町）  → カッコを外してくっつける(「町域名大町」)
function normalizeAddr2ForReverse(addr) {
  let processed = addr
    .replace(/[（(]その他[）)]/g, '')                  // （その他）は削除
    .replace(/[（(][^）)]*[〜～][^）)]*[）)]/g, '');   // 「〜」を含むカッコは削除(丁目範囲等)

  // 「、」を含むカッコは分配展開
  const match = processed.match(/^(.*?)[（(]([^）)]*、[^）)]*)[）)](.*?)$/);
  if (match) {
    const [, before, content, after] = match;
    return content.split('、').map(part =>
      (before + part + after)
        .replace(/.+(一円)$/, '')
        .replace(/.*(場合)$/, '')
        .trim()
    ).filter(x => x);
  }

  // それ以外はカッコを外して中身をくっつける
  const result = processed
    .replace(/[（(]([^）)]*)[）)]/g, '$1')
    .replace(/.+(一円)$/, '')
    .replace(/.*(場合)$/, '')
    .trim();
  return [result];
}

// ローマ字表記のサフィックス(SHI,KU等)を結合する
function combineSuffix(addr) {
  const combined = addr
    .replace( /^([A-Z]+) ([A-Z]+)$/, "$1-$2" )
    .replace( /^([A-Z]+) ([A-Z]+) ([A-Z]+) ([A-Z]+)$/, "$3-$4, $1-$2" );
  return combined;
}

// サフィックス(TO,KEN等)を削除する
function removeSuffix(addr) {
  return addr.replace(/ .+$/, '');
}

// 都道府県名(漢字)から都道府県コードに変換
function pref2code(pref) {
  const code = prefcodes[pref];
  // 都道府県コードが引けないのはおかしいのでパニック
  if (!code) {
    console.log('failed to lookup prefcode for', pref);
    process.exit(1);
  }
  return code;
}
