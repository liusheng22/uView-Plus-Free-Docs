const fs = require('fs');
const path = require('path');

// 配置
const config = {
  sourceDir: './html', // HTML 文件源目录
  targetDir: './src/pages', // Astro 页面目标目录
  layoutName: 'Layout', // 布局组件名称
  excludeFiles: ['test.html', 'README.md'], // 排除的文件（移除 index.html）
  defaultSEO: {
    title: 'uView-Plus 免费组件文档',
    description: 'uView Plus Free 免费文档，涵盖丰富的前端组件示例与用法，免费无广告，无登录，无扫码，无授权',
    keywords: 'uview-plus-free, uview-plus 免费文档, uView Plus, uView-Plus, uView, 免费文档, 离线文档, 组件, 移动端组件, 前端, UI, 组件库, liusheng, liusheng22',
    image: '/assets/logo.png',
    site_name: 'uView-Plus-Free 免费组件文档'
  }
};

// 从 HTML 内容中提取 SEO 信息
function extractSEOInfo(htmlContent, filename) {
  const seo = { ...config.defaultSEO };
  
  // 提取页面标题
  const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    seo.title = titleMatch[1].trim();
  } else {
    // 从文件名生成标题
    const name = path.basename(filename, '.html');
    seo.title = name.charAt(0).toUpperCase() + name.slice(1) + ' 组件';
  }
  
  // 提取页面描述（从 main-content 的第一个 p 标签）
  const descMatch = htmlContent.match(/<div[^>]*class="main-content"[^>]*>.*?<p[^>]*>([^<]+)<\/p>/is);
  if (descMatch) {
    seo.description = descMatch[1].trim();
  }
  
  // 提取页面关键词
  const keywordsMatch = htmlContent.match(/<meta[^>]*name="keywords"[^>]*content="([^"]+)"/i);
  if (keywordsMatch) {
    seo.keywords = keywordsMatch[1];
  }
  
  return seo;
}

// 清理 HTML 内容，提取 main-content 部分
function cleanHtmlContent(htmlContent) {
  // 提取 main-content 部分，使用更精确的匹配
  const mainContentMatch = htmlContent.match(/<div[^>]*class="main-content"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="right-phone"/i);
  if (mainContentMatch) {
    let content = mainContentMatch[1];
    
    // 处理代码块中的大括号，避免Astro解析错误
    content = processCodeBlocks(content);
    
    // 处理整个内容中的大括号（在代码块处理之后）
    content = content.replace(/\{/g, '&#123;');  // 替换 { 为 HTML 实体
    content = content.replace(/\}/g, '&#125;'); // 替换 } 为 HTML 实体
    
    return content.trim();
  }
  
  return '';
}

// 处理代码块中的大括号，避免Astro解析错误
function processCodeBlocks(content) {
  // 匹配 <pre><code>（允许二者都带属性，且中间允许空白）的标签内的内容
  return content.replace(
    /(<pre[^>]*>\s*<code[^>]*>)([\s\S]*?)(<\/code>\s*<\/pre>)/gi,
    (match, openTag, codeContent, closeTag) => {
      // 1) 先在代码块内部解码 HTML 实体，统一为原始字符，避免半转义
      let decoded = codeContent
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');

      // 2) 在原始标签片段内修正连字符被空格拆开的情况（up - form 等）
      decoded = decoded.replace(/(<[^>]*>)/g, (segment) => {
        return segment.replace(/(\w)\s*-\s*(\w)/g, '$1-$2');
      });

      // 3) 最后统一对 &, <, > 进行转义，确保不会被 Astro 解析，且无半转义
      let reEncoded = decoded
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      return openTag + reEncoded + closeTag;
    }
  );
}

// 清理和转义字符串，处理换行和特殊字符
function cleanString(str) {
  if (!str) return '';
  
  return str
    .replace(/\n/g, ' ')           // 换行符替换为空格
    .replace(/\r/g, ' ')           // 回车符替换为空格
    .replace(/\t/g, ' ')           // 制表符替换为空格
    .replace(/\s+/g, ' ')          // 多个空格替换为单个空格
    .replace(/"/g, '\\"')          // 双引号转义
    .replace(/'/g, "\\'")          // 单引号转义
    .trim();                       // 去除首尾空格
}

// 生成 Astro 页面内容
function generateAstroPage(filename, seoInfo, htmlContent) {
  const name = path.basename(filename, '.html');
  const route = name === 'index' ? '/' : `/${name}`;
  
  // 清理和转义所有字符串
  const cleanTitle = cleanString(seoInfo.title);
  const cleanDescription = cleanString(seoInfo.description);
  const cleanKeywords = cleanString(seoInfo.keywords);
  const cleanImage = cleanString(seoInfo.image);
  const cleanSiteName = cleanString(seoInfo.site_name);
  
  return `---
const title = "${cleanTitle}";
const description = "${cleanDescription}";
const keywords = "${cleanKeywords}";
const image = "${cleanImage}";
const site_name = "${cleanSiteName}";
const route = "${route}";

import Layout from '../layouts/${config.layoutName}.astro';
---

<Layout 
  title={title} 
  description={description} 
  keywords={keywords}
  image={image}
  site_name={site_name}
  route={route}
>
  ${htmlContent}
</Layout>`;
}

// 创建布局组件
function createLayoutComponent() {
  const layoutContent = `---
const { 
  title, 
  description, 
  keywords, 
  image, 
  site_name,
  route 
} = Astro.props;

const url = Astro.url.origin + route;
---

<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta name="keywords" content={keywords} />
    
    <!-- Open Graph -->
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={url} />
    <meta property="og:image" content={image} />
    <meta property="og:site_name" content={site_name} />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={image} />
    <meta name="twitter:url" content={url} />
    
    <!-- 结构化数据 -->
    <script type="application/ld+json" set:html={JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': site_name,
      'url': url,
      'description': description,
      'inLanguage': 'zh-CN',
      'image': image
    })} />
    
    <!-- 样式文件 -->
    <link rel="stylesheet" href="/css/global.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css" />
  </head>
  <body>
    <div class="left-menu">
      <h3>uview-plus 组件文档</h3>
      <ul id="menu"></ul>
    </div>
    <div class="main-content">
      <slot />
    </div>
    <div class="right-phone">
      <div class="right-phone-inner">
        <iframe
          id="iframeId"
          src="https://uview-plus.jiangruyi.com/h5/#/"
          width="100%"
          height="90%"
          frameborder="0"
        ></iframe>
      </div>
    </div>
    
    <!-- 脚本文件 -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
    <script is:inline src="/js/app.js"></script>
  </body>
</html>`;

  const layoutsDir = path.join(config.targetDir, '..', 'layouts');
  if (!fs.existsSync(layoutsDir)) {
    fs.mkdirSync(layoutsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(layoutsDir, `${config.layoutName}.astro`),
    layoutContent
  );
  
  console.log('✅ 创建布局组件:', `${config.layoutName}.astro`);
}

// 主迁移函数
function migrateHtmlToAstro() {
  console.log('🚀 开始批量迁移 HTML 到 Astro...');
  
  // 确保目标目录存在
  if (!fs.existsSync(config.targetDir)) {
    fs.mkdirSync(config.targetDir, { recursive: true });
  }
  
  // 创建布局组件
  createLayoutComponent();
  
  // 读取源目录下的所有 HTML 文件
  const files = fs.readdirSync(config.sourceDir)
    .filter(file => file.endsWith('.html') && !config.excludeFiles.includes(file));
  
  console.log(`📁 找到 ${files.length} 个 HTML 文件需要迁移`);
  
  let successCount = 0;
  let errorCount = 0;
  
  files.forEach((filename, index) => {
    try {
      const filePath = path.join(config.sourceDir, filename);
      const htmlContent = fs.readFileSync(filePath, 'utf8');
      
      // 提取 SEO 信息
      const seoInfo = extractSEOInfo(htmlContent, filename);
      
      // 清理 HTML 内容
      const cleanContent = cleanHtmlContent(htmlContent);
      
      // 生成 Astro 页面
      const astroContent = generateAstroPage(filename, seoInfo, cleanContent);
      
      // 写入 Astro 文件
      const astroFilename = path.basename(filename, '.html') + '.astro';
      const astroPath = path.join(config.targetDir, astroFilename);
      
      fs.writeFileSync(astroPath, astroContent);
      
      console.log(`✅ [${index + 1}/${files.length}] 迁移成功: ${filename} -> ${astroFilename}`);
      console.log(`   📝 SEO: ${seoInfo.title}`);
      
      successCount++;
    } catch (error) {
      console.error(`❌ [${index + 1}/${files.length}] 迁移失败: ${filename}`, error.message);
      errorCount++;
    }
  });
  
  console.log('\n📊 迁移完成统计:');
  console.log(`   ✅ 成功: ${successCount} 个文件`);
  console.log(`   ❌ 失败: ${errorCount} 个文件`);
  console.log(`   📁 输出目录: ${config.targetDir}`);
  
  if (successCount > 0) {
    console.log('\n🎉 迁移完成！现在你可以:');
    console.log('   1. 运行 pnpm dev 启动开发服务器');
    console.log('   2. 访问 http://localhost:4321 查看迁移后的页面');
    console.log('   3. 运行 pnpm build 构建生产版本');
  }
}

// 运行迁移
if (require.main === module) {
  migrateHtmlToAstro();
}

module.exports = { migrateHtmlToAstro, config }; 