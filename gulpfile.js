var gulp = require("gulp");
var uglify = require("gulp-uglify");
var htmlmin = require("gulp-htmlmin");

function copyTemplates() {
  return gulp.src("./tracking-templates/*").pipe(gulp.dest("./tracking-templates-minified"));
}

function minifyJsTemplates() {
  return gulp
    .src("./tracking-templates-minified/*.js")
    .pipe(uglify({
      compress: {
        arguments: false,
        arrows: false,
        assignments: false,
        booleans: false,
        comparisons: false,
        conditionals: false,
        evaluate: false,
        if_return: false,
        keep_fargs: true,
        keep_fnames: true,
      },
    }))
    .pipe(gulp.dest("./tracking-templates-minified"));
}

function minifyHtmlTemplates() {
  return gulp.src('./tracking-templates-minified/*.html')
    .pipe(htmlmin({
      collapseWhitespace: true,
    }))
    .pipe(gulp.dest('./tracking-templates-minified'));
}

exports.default = gulp.series(copyTemplates, minifyJsTemplates, minifyHtmlTemplates);
