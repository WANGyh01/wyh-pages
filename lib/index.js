const {src, dest, parallel, series, watch} = require('gulp')

const del = require('del') // 清空目录
const browserSync = require('browser-sync')

const loadPlugins = require('gulp-load-plugins') // 加载插件

const plugins = loadPlugins()
const bs = browserSync.create()

const cwd = process.cwd()
let config = {
  // default config

  // 定义可配置的目录
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**'
    }
  }
}

try {
  const loadConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({}, config, loadConfig)
} catch (e) {

}

// const sass = require('gulp-sass') // sass -> css
// const babel = require('gulp-babel')
// const swig = require('gulp-swig') // 模板引擎
// const imagemin = require('gulp-imagemin')

// 模板中的数据
// const data =

const clean = () => {
  return del([config.build.dist, config.build.temp]) // 返回的是promise
}

const style = () => {
  return src(config.build.paths.styles, {base: config.build.src, cwd: config.build.src})
  .pipe(plugins.sass({outputStyle: 'expanded'}))
  .pipe(dest(config.build.dist))
  .pipe(bs.reload({stream: true})) // 改变后 以流的方式向浏览器推 可以去掉bs.init 中的files属性
}

const script = () => {
  return src(config.build.paths.scripts, {base: config.build.src, cwd: config.build.src})
  // .pipe(plugins.babel({presets: ['@babel/preset-env']}))
  .pipe(plugins.babel({presets: [require('@babel/preset-env')]}))
  .pipe(dest(config.build.dist))
  .pipe(bs.reload({stream: true})) // 改变后 以流的方式向浏览器推 可以去掉bs.init 中的files属性
}

const page = () => {
  return src(config.build.paths.pages, {base: config.build.src, cwd: config.build.src})
  .pipe(plugins.swig({data: config.data}))
  .pipe(dest(config.build.temp))
  .pipe(bs.reload({stream: true})) // 改变后 以流的方式向浏览器推 可以去掉bs.init 中的files属性
}

const image = () => {
  return src(config.build.paths.images, {base: config.build.src, cwd: config.build.src})
  .pipe(plugins.imagemin())
  .pipe(dest(config.build.dist))
}

const font = () => {
  return src(config.build.paths.fonts, {base: config.build.src, cwd: config.build.src})
  .pipe(plugins.imagemin())
  .pipe(dest(config.build.dist))
}

const extra = () => {
  return src('**', {base: config.build.public, cwd: config.build.public})
  .pipe(dest(config.build.dist))
}

const serve = () => {
  // 监听到哪些文件改变，执行对应的方法
  watch(config.build.paths.scripts, {cwd: config.build.src}, script)
  watch(config.build.paths.styles, {cwd: config.build.src}, style)
  watch(config.build.paths.pages, {cwd: config.build.src}, page)
  // 其他资源
  // watch('src/assets/images/**', image)
  // watch('src/assets/fonts/**', font)
  // watch('public/**', extra)
  watch([
    config.build.paths.images,
    config.build.paths.fonts,
  ], {cwd: config.build.src}, bs.reload())

  watch('**', {cwd: config.build.src}, bs.reload())

  bs.init({
    notify: false,
    port: 2080,
    // open: false, // 自动打开浏览器
    // files: 'dist/**', //监听哪些文件更新会更新页面
    server: {
      // baseDir: 'dist', // 支持传入数组，从第一个元素开始查找
      baseDir: [config.build.temp, config.build.src, config.build.public], // 支持传入数组，从第一个元素开始查找
      // 目录指向
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}

// 处理html中的资源引用

// <!-- build:js assets/scripts/vendor.js -->
// <script src="/node_modules/jquery/dist/jquery.js"></script>
// <script src="/node_modules/popper.js/dist/umd/popper.js"></script>
// <script src="/node_modules/bootstrap/dist/js/bootstrap.js"></script>
// <!-- endbuild -->
// <!-- build:js assets/scripts/main.js -->

const useRef = () => {
  return src(config.build.paths.pages, {base: config.build.temp, cwd: config.build.temp})
  .pipe(plugins.useref({searchPath: [config.build.temp, '.']}))
  // 压缩 html js css
  .pipe(plugins.if(/\.js$/, plugins.uglify()))
  .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
  .pipe(plugins.if(/\.html$/, plugins.htmlmin({
    collapseWhitespace: true,
    minifyCSS: true,
    minifyJS: true
  })))
  .pipe(dest(config.build.dist))
}

// 组合任务
const compile = parallel(style, script, page)
const build = series(clean, parallel(series(compile, useRef), extra, image, font))
const develop = series(compile, serve)

module.exports = {
  clean,
  build,
  develop,
}
