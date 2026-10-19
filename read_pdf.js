const fs = require('fs');
const zlib = require('zlib');

const pdfPath = process.argv[2];
const buf = fs.readFileSync(pdfPath);
const str = buf.toString('binary');

// Build CMap (character code to Unicode mapping) for CIDFonts
const cmaps = {};
const cmapStreams = [];

// Find all decompressed streams
const streamRegex = /stream\r?\n/g;
const endstreamRegex = /\r?\nendstream/g;
const streamStarts = [];
let match;
while ((match = streamRegex.exec(str)) !== null) {
    streamStarts.push(match.index + match[0].length);
}
const streamEnds = [];
while ((match = endstreamRegex.exec(str)) !== null) {
    streamEnds.push(match.index);
}

const decompressedStreams = [];
for (let i = 0; i < Math.min(streamStarts.length, streamEnds.length); i++) {
    const start = streamStarts[i];
    const end = streamEnds[i];
    if (end <= start) continue;
    const streamData = buf.slice(start, end);
    try {
        const dec = zlib.inflateSync(streamData);
        decompressedStreams.push(dec.toString('utf-8'));
    } catch (e) {
        // raw stream
        const raw = streamData.toString('utf-8');
        if (/[\x20-\x7E]{20,}/.test(raw)) {
            decompressedStreams.push(raw);
        }
    }
}

// Build unicode mappings from CMap streams
const unicodeMaps = {};
for (const stream of decompressedStreams) {
    if (!stream.includes('beginbfchar') && !stream.includes('beginbfrange')) continue;
    
    const map = {};
    // Parse beginbfchar entries
    const bfcharRegex = /<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>/g;
    let bfm;
    while ((bfm = bfcharRegex.exec(stream)) !== null) {
        const from = parseInt(bfm[1], 16);
        const to = parseInt(bfm[2], 16);
        map[from] = String.fromCharCode(to);
    }
    
    // Store with an index key
    const idx = Object.keys(unicodeMaps).length;
    unicodeMaps[idx] = map;
}

// Now extract text from content streams
let fullText = [];
let currentLine = [];

for (const stream of decompressedStreams) {
    if (!stream.includes('BT') && !stream.includes('Tj') && !stream.includes('TJ')) continue;
    
    const lines = stream.split('\n');
    for (const line of lines) {
        const l = line.trim();
        
        // Check for new line positioning
        const tdMatch = l.match(/([\d.-]+)\s+([\d.-]+)\s+Td/);
        if (tdMatch) {
            const dy = parseFloat(tdMatch[2]);
            if (Math.abs(dy) > 0.1) {
                if (currentLine.length > 0) {
                    fullText.push(currentLine.join(''));
                    currentLine = [];
                }
            }
        }
        
        const tmMatch = l.match(/[\d.-]+\s+[\d.-]+\s+[\d.-]+\s+[\d.-]+\s+[\d.-]+\s+([\d.-]+)\s+Tm/);
        if (tmMatch) {
            if (currentLine.length > 0) {
                fullText.push(currentLine.join(''));
                currentLine = [];
            }
        }
        
        // Handle hex string Tj: <hex> Tj
        const hexTjRegex = /<([0-9a-fA-F]+)>\s*Tj/g;
        let hexMatch;
        while ((hexMatch = hexTjRegex.exec(l)) !== null) {
            const hex = hexMatch[1];
            let decoded = '';
            // Try 2-byte codes first, then 1-byte
            if (hex.length % 4 === 0) {
                for (let i = 0; i < hex.length; i += 4) {
                    const code = parseInt(hex.substr(i, 4), 16);
                    // Look up in all unicode maps
                    let found = false;
                    for (const mapKey in unicodeMaps) {
                        if (unicodeMaps[mapKey][code]) {
                            decoded += unicodeMaps[mapKey][code];
                            found = true;
                            break;
                        }
                    }
                    if (!found) decoded += String.fromCharCode(code);
                }
            } else {
                for (let i = 0; i < hex.length; i += 2) {
                    const code = parseInt(hex.substr(i, 2), 16);
                    let found = false;
                    for (const mapKey in unicodeMaps) {
                        if (unicodeMaps[mapKey][code]) {
                            decoded += unicodeMaps[mapKey][code];
                            found = true;
                            break;
                        }
                    }
                    if (!found) decoded += String.fromCharCode(code);
                }
            }
            currentLine.push(decoded);
        }
        
        // Handle parenthesized string Tj
        const parenTjRegex = /\(([^)]*)\)\s*Tj/g;
        let ptjMatch;
        while ((ptjMatch = parenTjRegex.exec(l)) !== null) {
            let t = ptjMatch[1]
                .replace(/\\227/g, '\u2014')  // em dash
                .replace(/\\225/g, '\u2022')  // bullet
                .replace(/\\222/g, '\u2019')  // right single quote
                .replace(/\\223/g, '\u201C')  // left double quote
                .replace(/\\224/g, '\u201D')  // right double quote
                .replace(/\\\(/g, '(')
                .replace(/\\\)/g, ')')
                .replace(/\\\\/g, '\\');
            currentLine.push(t);
        }
        
        // Handle TJ arrays
        const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
        let taMatch;
        while ((taMatch = tjArrayRegex.exec(l)) !== null) {
            const inner = taMatch[1];
            const partRegex = /\(([^)]*)\)/g;
            let partMatch;
            while ((partMatch = partRegex.exec(inner)) !== null) {
                let t = partMatch[1]
                    .replace(/\\227/g, '\u2014')
                    .replace(/\\225/g, '\u2022')
                    .replace(/\\222/g, '\u2019')
                    .replace(/\\223/g, '\u201C')
                    .replace(/\\224/g, '\u201D')
                    .replace(/\\\(/g, '(')
                    .replace(/\\\)/g, ')')
                    .replace(/\\\\/g, '\\');
                currentLine.push(t);
            }
        }
    }
}
if (currentLine.length > 0) {
    fullText.push(currentLine.join(''));
}

console.log(fullText.join('\n'));
