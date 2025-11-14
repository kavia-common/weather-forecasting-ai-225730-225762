#!/bin/bash
cd /home/kavia/workspace/code-generation/weather-forecasting-ai-225730-225762/frontend_react_weather
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

