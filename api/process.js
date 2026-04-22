const { minify } = require('html-minifier-terser');
const CleanCSS = require('clean-css');
const UglifyJS = require('uglify-js');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-License-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { code, type = 'html', options = {} } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code is required and must be a string' });
    }

    if (!['html', 'css', 'js', 'javascript'].includes(type.toLowerCase())) {
      return res.status(400).json({ error: 'Type must be html, css, or js' });
    }

    let result;
    let originalSize = Buffer.byteLength(code, 'utf8');
    let minifiedSize;
    let savings;

    const typeLower = type.toLowerCase();

    if (typeLower === 'html') {
      const minifyOptions = {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: true,
        ...options
      };
      result = await minify(code, minifyOptions);
    } else if (typeLower === 'css') {
      const cleanCSS = new CleanCSS({
        level: 2,
        ...options
      });
      const output = cleanCSS.minify(code);
      result = output.styles;
    } else if (typeLower === 'js' || typeLower === 'javascript') {
      const uglifyOptions = {
        compress: {
          drop_console: false,
          drop_debugger: true,
          ...options.compress
        },
        mangle: options.mangle !== false,
        ...options
      };
      const output = UglifyJS.minify(code, uglifyOptions);
      if (output.error) {
        return res.status(400).json({ error: output.error.message });
      }
      result = output.code;
    }

    minifiedSize = Buffer.byteLength(result, 'utf8');
    savings = originalSize - minifiedSize;
    const savingsPercent = originalSize > 0 ? ((savings / originalSize) * 100).toFixed(2) : 0;

    return res.status(200).json({
      success: true,
      original: code,
      minified: result,
      stats: {
        originalSize,
        minifiedSize,
        savings,
        savingsPercent: parseFloat(savingsPercent),
        type: typeLower
      }
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
