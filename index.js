const iconv = require('iconv').Iconv;
const superagent = require('superagent')
const cheerio = require('cheerio')
const moment = require('moment')
const csvParse = require('csv-parse/lib/sync')
const fs = require("fs")

const dateRE = new RegExp(/[0-9]{4}\/[0-9]{1,2}\/[0-9]{1,2}/) // ガバガバなので注意

function toHalfWidth(str) {
  return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
}

function toAD(warei) {
  let [, era, year] = warei.match(/^(明治|大正|昭和|平成|令和)([元\d]+)年?/, match => {
    if (match === '元') return 1
  })

  if (era === undefined) throw new Error('Not japanese calendar')

  year = Number(year)

  if (era === '明治') {
    year += 1867;
  } else if (era === '大正') {
    year += 1911;
  } else if (era === '昭和') {
    year += 1925;
  } else if (era === '平成') {
    year += 1988;
  } else if (era === '令和') {
    year += 2018;
  }

  return year;
}

function csvToObj(csv) {
  let dateKey

  const csvObj = csvParse(csv, { columns: true, skip_empty_lines: true })
    .map(row => {
      dateKey = '集計時点_年月日' in row ? '集計時点_年月日' : '公表年月日' // 大した件数ではないので妥協

      return {
        ...row, [dateKey]: moment(row[dateKey], dateRE.test(row[dateKey]) ? 'YYYY/M/D' : 'M月D日')
      }
    })
    .sort((a, b) => a[dateKey] - b[dateKey])

  return csvObj
}

const opendata = [
  {
    name: 'contacts',
    csv: 'http://www.okayama-opendata.jp/ckan/dataset/e6b3c1d2-2f1f-4735-b36e-e45d36d94761/resource/165b2f56-d472-4b71-8c81-f97f898f1923/download',
    convert: async (conf) => {
      const csv = await superagent(conf.csv).responseType('blob').then(({ body }) => body)

      const csvObj = csvToObj(new iconv('SHIFT_JIS', 'UTF-8').convert(csv).toString())

      return {
        date: csvObj[csvObj.length - 1].集計時点_年月日.format('YYYY/MM/DD 21:00'),
        data: csvObj.map(row => ({
          日付: `${row.集計時点_年月日.format('YYYY-MM-DD')}T08:00:00.000Z`,
          小計: Number(row.相談件数_計)
        }))
      }
    }
  },
  {
    name: 'querents',
    csv: 'http://www.okayama-opendata.jp/ckan/dataset/e6b3c1d2-2f1f-4735-b36e-e45d36d94761/resource/f38ae73f-73c1-4f34-8174-1b188c77c713/download',
    convert: async (conf) => {
      const csv = await superagent(conf.csv).responseType('blob').then(({ body }) => body)

      const csvObj = csvToObj(new iconv('SHIFT_JIS', 'UTF-8').convert(csv).toString())

      return {
        date: csvObj[csvObj.length - 1].集計時点_年月日.format('YYYY/MM/DD 21:00'),
        data: csvObj.map(row => ({
          日付: `${row.集計時点_年月日.format('YYYY-MM-DD')}T08:00:00.000Z`,
          小計: Number(row.相談件数)
        }))
      }
    }
  },
  {
    name: 'inspections_summary',
    csv: 'http://www.okayama-opendata.jp/ckan/dataset/e6b3c1d2-2f1f-4735-b36e-e45d36d94761/resource/60ecd874-0f71-4d9f-9a8a-936fad9c99bc/download',
    convert: async (conf) => {
      const csv = await superagent(conf.csv).responseType('blob').then(({ body }) => body)

      const csvObj = csvToObj(new iconv('SHIFT_JIS', 'UTF-8').convert(csv).toString())

      return {
        date: csvObj[csvObj.length - 1].集計時点_年月日.format('YYYY/MM/DD 21:00'),
        data: csvObj.map(row => ({
          日付: `${row.集計時点_年月日.format('YYYY-MM-DD')}T08:00:00.000Z`,
          小計: Number(row.検査実施人数)
        }))
      }
    }
  },
  {
    name: 'patients_summary',
    csv: 'http://www.okayama-opendata.jp/ckan/dataset/e6b3c1d2-2f1f-4735-b36e-e45d36d94761/resource/0c728c2e-a366-421d-95df-86b6b5ad15fd/download',
    convert: async (conf) => {
      const csv = await superagent(conf.csv).responseType('blob').then(({ body }) => body)

      const csvObj = csvToObj(new iconv('SHIFT_JIS', 'UTF-8').convert(csv).toString())

      return {
        date: csvObj[csvObj.length - 1].集計時点_年月日.format('YYYY/MM/DD 21:00'),
        data: csvObj.map(row => ({
          日付: `${row.集計時点_年月日.format('YYYY-MM-DD')}T08:00:00.000Z`,
          小計: Number(row.日別の感染者数)
        }))
      }
    }
  },
  {
    name: 'patients',
    csv: 'http://www.okayama-opendata.jp/ckan/dataset/e6b3c1d2-2f1f-4735-b36e-e45d36d94761/resource/c6503ebc-b2e9-414c-aae7-7374f4801e21/download',
    convert: async (conf) => {
      const csv = await superagent(conf.csv).responseType('blob').then(({ body }) => body)

      const csvObj = csvToObj(new iconv('SHIFT_JIS', 'UTF-8').convert(csv).toString())

      return {
        date: csvObj[csvObj.length - 1].公表年月日.format('YYYY/MM/DD 21:00'),
        data: csvObj.map(row => ({
          リリース日: `${row.公表年月日.format('YYYY-MM-DD')}T08:00:00.000Z`,
          居住地: row.患者＿居住地,
          年代: row.患者＿年代,
          性別: row.患者＿性別,
          退院: "",
          date: row.公表年月日.format('YYYY-MM-DD')
        }))
      }
    }
  },
  {
    name: 'main_summary',
    convert: async (conf) => {
      const inspectionsSummary = require('./data/inspections_summary.json').data
      const patientsSummary = require('./data/patients_summary.json').data

      return {
        last_update: moment().format('YYYY/MM/DD 21:00'),
        attr: '検査実施人数',
        value: inspectionsSummary.reduce((total, row) => total + row.小計, 0),
        children: [
          {
            attr: '陽性患者数',
            value: patientsSummary.reduce((total, row) => total + row.小計, 0),
            children: [
              {
                attr: '入院中',
                value: 0
              },
              {
                attr: '退院',
                value: 0
              },
              {
                attr: '死亡',
                value: 0
              }
            ]
          }
        ]
      }
    }
  },
  {
    name: 'medical_system',
    url: 'https://www.pref.okayama.jp/kinkyu/645925.html',
    convert: async (conf) => {

      const html = await superagent(conf.url).then(({ text }) => text)
      const $ = cheerio.load(html)
      const el = $('#main_body > div:nth-child(2) > p:nth-child(68)').children()

      const [, rawDate] = toHalfWidth(el[0].next.nodeValue).match(/^（(.+)現在）$/) // 日付

      const RE = /^\s*?\(\d\).+\s(\d+)[床|台]/
      const [, bed] = toHalfWidth(el[2].children[0].nodeValue).match(RE) // 確保病床
      const [, ventilator] = toHalfWidth(el[2].children[2].children[0].nodeValue).match(RE) // 人工呼吸器
      const [, ecmo] = toHalfWidth(el[2].children[3].nodeValue).match(RE) // ECMO

      return {
        date: moment(`${toAD(rawDate)}年${rawDate.match(/\d+月\d+日/)[0]}`, 'YYYY年M月D日').format('YYYY/MM/DD 00:00'),
        items: {
          bed: Number(bed),
          ventilator: Number(ventilator),
          ecmo: Number(ecmo)
        }
      }
    }
  },
  {
    name: 'news',
    url: 'http://fight-okayama.jp/',
    convert: async (conf) => {
      const html = await superagent(conf.url).then(({ text }) => text)

      const $ = cheerio.load(html)

      const items = $('body > main > section.section.news > div > ul').children().map((i, el) => ({
        date: el.children[0].children[0].children[0].nodeValue,
        url: el.children[0].attribs.href,
        text: el.children[0].children[1].children[0].nodeValue
      })).toArray()

      return {
        newsItems: items
      }
    }
  },
  {
    name: 'last_update',
    convert: async (conf) => {
      return {
        date: moment().format('YYYY/MM/DD 21:00'),
      }
    }
  },
];

(async () => {
  for (const conf of opendata) {
    const data = await conf.convert(conf)
    fs.writeFileSync(`data/${conf.name}.json`, `${JSON.stringify(data, undefined, 4)}\n`);
  }
})()
