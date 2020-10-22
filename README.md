# Node BDO LanguageData

Localization file decompress/compress library for Black Desert Online.

Install:

```
npm i bdo-languagedata
```

Example:

```
const fs = require('fs')
const bdo_languagedata = require('bdo-languagedata')

//Decompress
bdo_languagedata.decompress('./languagedata_en.loc').then(result => {
	fs.writeFileSync('./languagedata_en_decompress.tsv', result, 'utf16le');
})

//Compress
bdo_languagedata.compress('./languagedata_en_decompress.tsv').then(result => {
	fs.writeFileSync('./languagedata_en_compress.loc', result);
})
```
