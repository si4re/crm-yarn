var gulp = require('gulp');
var inject = require('gulp-inject');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');

gulp.task('copy', function () {
    gulp.src('test.file')
        .pipe(gulp.dest(' dest folder'))
});


gulp.task('index', function () {
    var target = gulp.src('./app/views/index.html');
    // It's not necessary to read the files (will speed up things), we're only after their paths:
    var sources = gulp.src(['./app/*.js', './app/*.css'], {
        read: false
      
    });

    return target.pipe(inject(sources))
        .pipe(gulp.dest('./app'));
});


gulp.task('build_libs', function () {
    return gulp.src([
           

            'node_modules/angular/angular.js',
            'node_modules/angular-route/angular-route.js',
            'node_modules/angular-file-upload/dist/angular-file-upload.min.js',
            'node_modules/angular-animate/angular-animate.js',
            'node_modules/angular-read-more/dist/readmore.min.js',
            'node_modules/angular-ymaps/angular-ymaps.js',

            'node_modules/angular-js-xlsx/angular-js-xlsx.js',

            'node_modules/xlsx/dist/xlsx.core.min.js',
            
            
            
            'node_modules/jquery/dist/jquery.js',
            'node_modules/tether/dist/js/tether.js',
            'node_modules/popper/dist/js/index.js',
            'node_modules/bootstrap/dist/js/bootstrap.js',

            //, 'bower_components/**//font-awesome/css/font-awesome.min.css'
            //, 'bower_components/**/font-awesome/fonts/*.*'

        ])
        //.pipe(uglify()) // not work xlsx@0.11.8
        .pipe(concat('libs.js'))
        .pipe(gulp.dest('./app'));
});


gulp.task('build_css', function () {
    return gulp.src([

            'node_modules/font-awesome/css/font-awesome.min.css',
            'node_modules/bootstrap/dist/css/bootstrap.min.css',
            '/css/hm-read-more_style.css'
            
        ])
      
        .pipe(concat('css.css'))
        .pipe(gulp.dest('./app'));
});


gulp.task('concat_angular', function () {
    return gulp.src([
            './app/controllers/myApp.js',
            '!./app/controllers/authentication_node.js',
            './app/controllers/*.js',
            './app/services/*.js'
        ])
        
        .pipe(concat('scripts.js'))
     
        .pipe(gulp.dest('./app'));
});

gulp.task('dev', ['build_libs', 'concat_angular', 'build_css'], function () {

});


gulp.task('watch', function () {
    gulp.watch('/app/**/*.js', ['dev']);
 });


