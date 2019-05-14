const rp = require('request-promise');

const AWS = require('aws-sdk');

const conversions = require('conversions');

const input = require('./input.json');

const firehose = new AWS.Firehose({ apiVersion: '2015-08-04' });

// access accuweather location api endpoint
module.exports.getLocationsInfo = async () => {
  const locationsRequests = input.cities.map(c => rp({
    uri: `http://dataservice.accuweather.com/locations/v1/cities/${input.countryCode}/${c.adminCode}/search`,
    qs: {
      apikey: process.env.ACCUWEATHER_API_KEY,
      q: c.name,
      language: 'pt-br',
      details: true,
    },
    json: true,
  }));

  return Promise.all(locationsRequests)
    .then(locations => firehose.putRecord({
      DeliveryStreamName: process.env.LOCATIONS_DELIVERY_STREAM,
      Record: {
        Data: locations.map((l, idx) => JSON.stringify({
          locationKey: input.cities[idx].locationKey,
          name: input.cities[idx].name,
          adminCode: input.cities[idx].adminCode,
          elevation: conversions(l[0].GeoPosition.Elevation.Metric.Value, l[0].GeoPosition.Elevation.Metric.Unit, 'm'),
          population: l[0].Details.Population,
        })).join('\n'),
      },
    }).promise());
};

// access accuweather conditions api endpoint
module.exports.getConditionsInfo = async () => {
  const conditionsRequests = input.cities.map(c => rp({
    uri: `http://dataservice.accuweather.com/currentconditions/v1/${c.locationKey}/historical/24`,
    qs: {
      apikey: process.env.ACCUWEATHER_API_KEY,
      language: 'pt-br',
      details: true,
    },
    json: true,
  }));

  return Promise.all(conditionsRequests)
    .then(conditions => firehose.putRecord({
      DeliveryStreamName: process.env.CONDITIONS_DELIVERY_STREAM,
      Record: {
        Data: conditions.map((cds, idx) => cds.map(cd => JSON.stringify({
          locationKey: input.cities[idx].locationKey,
          name: input.cities[idx].name,
          adminCode: input.cities[idx].adminCode,
          dateTime: cd.LocalObservationDateTime,
          epochTime: cd.EpochTime,
          precipitation: cd.PrecipitationSummary.PastHour.Metric.Value,
          temperature: cd.Temperature.Metric.Value,
        })).join('\n')).join('\n'),
      },
    }).promise());
};
