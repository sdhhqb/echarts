cls
cd ..

rd/s/q .\dist

call npm run prepublish

call .\node_modules\.bin\webpack
echo "p01"
call .\node_modules\.bin\webpack -p
echo "p02"
call .\node_modules\.bin\webpack --config extension\webpack.config.js
echo "p03"
call .\node_modules\.bin\webpack --config extension\webpack.config.js -p
echo "p04"

cd build