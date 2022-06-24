'use strict';

var gulp = require( 'gulp' );
var download = require( 'gulp-download' );
var decompress = require( 'gulp-decompress' );
var convertEncoding = require( 'gulp-convert-encoding' );
var chmod = require( 'gulp-chmod' );
var postal2json = require( './lib/postal2json.js' );
var jigyosyo2json = require( './lib/jigyosyo2json.js' );
var v1 = require( './lib/v1.js' );
var v2 = require( './lib/v2.js' );

gulp.task( 'download', function () {
  var urls = [
    'http://www.post.japanpost.jp/zipcode/dl/roman/naccs1.zip',
    'http://www.post.japanpost.jp/zipcode/dl/kogaki/zip/ken_all.zip',
    'http://www.post.japanpost.jp/zipcode/dl/jigyosyo/zip/jigyosyo.zip'
  ];
  return download( urls )
    .pipe( decompress() )
    .pipe( convertEncoding( { from: "shift_jis", to: "utf-8" } ) )
    .pipe( chmod( 644 ) )
    .pipe( gulp.dest( 'api' ) );
} );

/**
 * Create an API of the postal code.
 */
gulp.task( 'v1', function () {
  return gulp.src( 'api/NACCS1.CSV' )
    .pipe( postal2json() )
    .pipe( v1() )
    .pipe( chmod( 644 ) )
    .pipe( gulp.dest( 'api/v1' ) );
} );

/**
 * Create an API of the Jigyosyo postal code.
 */
gulp.task( 'v1-jigyosyo', function () {
  return gulp.src( 'api/JIGYOSYO.CSV' )
    .pipe( jigyosyo2json() )
    .pipe( v1() )
    .pipe( chmod( 644 ) )
    .pipe( gulp.dest( 'api/v1' ) );
} );

/**
 * Create an v2 API
 */
gulp.task( 'v2', function () {
  return gulp.src( 'gulpfile.js' ) // dummy input
    .pipe( v2() )
    .pipe( chmod( 644 ) )
    .pipe( gulp.dest( 'api/v2' ) );
} );

exports.default = gulp.series(
  'download',
  gulp.parallel( 'v1', 'v1-jigyosyo', 'v2' ),
);
