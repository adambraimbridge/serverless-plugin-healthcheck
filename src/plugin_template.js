'use strict'

/** Generated by Serverless HealthCheck Plugin at #{creationDate} */
const aws = require('aws-sdk')
aws.config.region = '#{awsRegion}'
const lambda = new aws.Lambda()
const functionObjects = JSON.parse('#{healthchecks}')
module.exports.healthCheck = (event, context, callback) => {
  let invokes = []
  let checkResponses = []
  let errors = 0
  console.log('Health Check Start')
  functionObjects.forEach((functionObject) => {
    functionObject.checks.forEach((check) => {
      const params = {
        FunctionName: functionObject.name,
        InvocationType: 'RequestResponse',
        LogType: 'None',
        Qualifier: process.env.SERVERLESS_ALIAS || '$LATEST',
        Payload: JSON.stringify({pathParameters: check.params})
      }
      invokes.push(lambda.invoke(params).promise().then((data) => {
        const response = JSON.parse(data.Payload)
        const statusCode = response.statusCode || ''
        const errorMessage = response.errorMessage || 'Data was returned'
        const checkBody = check.format
        checkBody.ok = statusCode === 200
        checkBody.checkOutput = errorMessage
        checkBody.lastUpdated = new Date().toISOString()
        if (response.errorMessage) {
          errors++
        }
        console.log('Health Check Event Invoke: ' + functionObject.name + '(' + JSON.stringify(check.params) + '): ' + statusCode + ' ' + errorMessage)
        checkResponses.push(checkBody)
      }, (error) => {
        errors++
        console.log('Health Check Event Invoke Error: ' + functionObject.name, error)
        const checkBody = check.format
        checkBody.ok = false
        checkBody.checkOutput = error
        checkBody.lastUpdated = new Date().toISOString()
        checkResponses.push(checkBody)
      }))
    })
  })
  Promise.all(invokes).then(() => {
    console.log('Health Check Finished with ' + errors + ' invoke errors')
    const healthBody = JSON.parse('#{outputHeader}')
    healthBody.checks = checkResponses
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(healthBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })
  })
}