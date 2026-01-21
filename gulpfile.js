import gulp from "gulp";
import htmlmin from "gulp-htmlmin";
import minifyInline from "gulp-minify-inline";
import terser from "gulp-terser";
import yargs from "yargs";

const args = yargs(process.argv).argv;
const dest = args.dist || "dist";

const terserOptions = {
  compress: {
    arrows: false,
    booleans: false,
    comparisons: false,
    conditionals: false,
    drop_console: true,
    evaluate: false,
    if_return: false,
    keep_fargs: true,
    negate_iife: false,
    properties: false,
    typeofs: false,
  },
  mangle: true,
  output: {
    quote_keys: true,
  },
};

function minifyJS() {
  return gulp.src(`src/*.js`).pipe(terser(terserOptions)).pipe(gulp.dest(dest));
}

function minifyHTML() {
  return gulp
    .src(`src/*.html`)
    .pipe(minifyInline({ js: terserOptions }))
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(gulp.dest(dest));
}

export default gulp.parallel(minifyJS, minifyHTML);
