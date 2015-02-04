'use strict';
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var inline = require('gulp-inline');
require('web-component-tester').gulp.init(gulp);

gulp.task('build', function() {
  gulp.src('src/ld-presenter.html')
      .pipe(inline({
        base: 'src',
        js: uglify()
      }))
      .pipe(gulp.dest('.'));
});

gulp.task('default', ['build', 'test:local']);

gulp.task('ci', ['build', 'test:remote']);
