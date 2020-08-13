const fs = require('fs')
const zlib = require('zlib')

const utf16le_bom = "\ufeff";

const encrypt = (file) => {
	return new Promise(async (resolve, reject) => {
		let allLines = trim_Start(await fs.promises.readFile(file, 'utf16le'), utf16le_bom).split('\n');
		let chunks = [];
		for (let line of allLines) {
			if (line.trim().length <= 0) break;
			try {
				let content = line.split('\t').map((e, i) => { return i>4 ? trim_Start(e.replace(/<lf>/g, "\n").replace(/"/g, '').replace(/<quot>/g, `"`), `'`) : +e });
				let strSize = content[5].length;
				let size = 4+4+4+2+1+1+(strSize*2)+4;
				let i = 0;
				let buffer = Buffer.alloc(size);
				buffer.writeUInt32LE(strSize, i);
				buffer.writeUInt32LE(content[0], i+=4);
				buffer.writeUInt32LE(content[1], i+=4);
				buffer.writeUInt16LE(content[2], i+=4);
				buffer.writeUInt8(content[3], i+=2);
				buffer.writeUInt8(content[4], i+=1);
				buffer.write(content[5], i+=1, buffer.length-i, 'utf16le');
				chunks.push(buffer);
			} catch (err) {
				return reject(err);
			}
		}
		return resolve(Buffer.concat(chunks));
	})
}

const decrypt = (buffer) => {
	return new Promise(async (resolve, reject) => {
		let i = 0, result = [];
		while (i < buffer.length) {
			try {
				let strSize = buffer.slice(i, i+=4).readUInt32LE(); 
				let strType = buffer.slice(i, i+=4).readUInt32LE();
				let strID1 = buffer.slice(i, i+=4).readUInt32LE();
				let strID2 = buffer.slice(i, i+=2).readUInt16LE();
				let strID3 = buffer.slice(i, i+=1).readUInt8();
				let strID4 = buffer.slice(i, i+=1).readUInt8();
				let str = add_singleQuote(buffer.slice(i, i+=(strSize*2)).toString('utf16le').replace(/\n/g, '<lf>').replace(/"/g, '<quot>'));
				i += 4;
				result.push(`${strType}\t${strID1}\t${strID2}\t${strID3}\t${strID4}\t${str}`);
			} catch (err) { 
				return reject(err); 
			}
		}
		return resolve(`${utf16le_bom}${result.join('\n')}`);
	})
}

const zlib_compress = (buffer) => {
	return new Promise(async (resolve, reject) => {
		let size = Buffer.alloc(4);
		size.writeUInt32LE(buffer.length);
		zlib.deflate(buffer, { level: zlib.constants.Z_BEST_SPEED }, (err, result) => {
			if (err) return reject(err);
			return resolve(Buffer.concat([size, result]));
		});
	})
}

const zlib_decompress = (file) => {
	return new Promise(async (resolve, reject) => {
		fileToBuffer(file).then(buffer => {
			zlib.inflateRaw(buffer.slice(6), (err, result) => {
				if (err) return reject(err);
				resolve(result);
			});
		}).catch(err => { return reject(err) });
	})
}

function fileToBuffer(file) {
	return new Promise(async (resolve, reject) => {
		let readStream = fs.createReadStream(file);
    	let chunks = [];
    	readStream.on('error', err => { return reject(err) });
   		readStream.on('data', chunk => chunks.push(chunk) );
    	readStream.on('close', () => { return resolve(Buffer.concat(chunks)) });
	})
}

function trim_Start(str, char) {
	if (str.startsWith(char)) str = str.substr(char.length);
	return str;
}

function add_singleQuote(str) {
	if (!["+", "=", "-"].every(char => !str.startsWith(char))) str = `'${str}`;
	return str;
}

module.exports = {
	decompress(source = "./languagedata_en.loc") {
		return new Promise(async (resolve, reject) => {
			try {
				let data_decompress = await zlib_decompress(source);
				let data_decrypt = await decrypt(data_decompress);
				return resolve(data_decrypt);
			} catch (err) { return reject(err) }
		})
	},

	compress(source = "./languagedata_en.tsv") {
		return new Promise(async (resolve, reject) => {
			try {
				let data_encrypt = await encrypt(source);
				let data_compress = await zlib_compress(data_encrypt);
				return resolve(data_compress);
			} catch (err) { return reject(err) }
		})
	}
}