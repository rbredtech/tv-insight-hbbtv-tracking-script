var gulp = require("gulp");
var terser = require("gulp-terser");
var htmlmin = require("gulp-htmlmin");
var minifyInline = require("gulp-minify-inline");

var terserOptions = {
  ecma: 5,
  ie8: true,
  compress: {
    arrows: false,
    booleans: false,
    comparisons: false,
    conditionals: false,
    evaluate: false,
    if_return: false,
    keep_fargs: true,
    negate_iife: false,
    properties: false,
    typeofs: false,
  },
};

function copyTemplates() {
  return gulp.src("./tracking-templates/*").pipe(gulp.dest("./tracking-templates-minified"));
}

function minifyJsTemplates() {
  return gulp.src("./tracking-templates-minified/*.js").pipe(terser(terserOptions)).pipe(gulp.dest("./tracking-templates-minified"));
}

function minifyHtmlTemplates() {
  return gulp
    .src("./tracking-templates-minified/*.html")
    .pipe(minifyInline({ js: terserOptions }))
    .pipe(
      htmlmin({
        collapseWhitespace: true,
      }),
    )
    .pipe(gulp.dest("./tracking-templates-minified"));
}

exports.default = gulp.series(copyTemplates, minifyJsTemplates, minifyHtmlTemplates);
