/**
  * Copyright 2016, System Insights, Inc.
  *
  * Licensed under the Apache License, Version 2.0 (the "License");
  * you may not use this file except in compliance with the License.
  * You may obtain a copy of the License at
  *
  *    http://www.apache.org/licenses/LICENSE-2.0
  *
  * Unless required by applicable law or agreed to in writing, software
  * distributed under the License is distributed on an "AS IS" BASIS,
  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  * See the License for the specific language governing permissions and
  * limitations under the License.
  */

// Imports - External

const expect = require('expect.js');
const fs = require('fs');
const R = require('ramda');

// Imports - Internal

const ioEntries = require('./support/ioEntries');
const dataStorage = require('../src/dataStorage');
const lokijs = require('../src/lokijs');
const sameJSON = require('./support/sampleJSONOutput');
const differentJSON = require('./support/sampleJSONEdited');


// constants
const schemaPtr = lokijs.getSchemaDB();
const rawData = lokijs.getRawDataDB();
const uuid = '000';
const result1 = { time: '2014-08-11T08:32:54.028533Z',
dataitem: [{ name: 'avail', value: 'AVAILABLE' }] };

const input1 = ioEntries.input1;
const dbResult1 = [{ dataItemName: 'avail',
                uuid: '000',
                id: 'dtop_2',
                value: 'AVAILABLE',
                sequenceId: 6,
                time: '2014-08-11T08:32:54.028533Z' }];

const insertedObject = {
  xmlns: { 'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
  xmlns: 'urn:mtconnect.org:MTConnectDevices:1.3',
  'xmlns:m': 'urn:mtconnect.org:MTConnectDevices:1.3',
  'xsi:schemaLocation': 'urn:mtconnect.org:MTConnectDevices:1.3 http://www.mtconnect.org/schemas/MTConnectDevices_1.3.xsd' },
  time: '2013-02-11T12:12:57Z',
  uuid: '000',
  device: { $:
   { name: 'VMC-3Axis',
     uuid: '000',
     id: 'dev' },
  Description:
   [{ $: { manufacturer: 'SystemInsights' } }],
  DataItems:
   [{ DataItem:
        [{ $:
             { type: 'AVAILABILITY',
               category: 'EVENT',
               id: 'dtop_2',
               name: 'avail' } },
          { $:
             { type: 'EMERGENCY_STOP',
               category: 'EVENT',
               id: 'dtop_3',
               name: 'estop' } }] }] },
};


// test - insertSchemaToDB()


describe('insertSchematoDB()', () => {
  describe('inserts the device schema', () => {
    it('into the database ', () => {
      schemaPtr.clear();
      const jsonFile = fs.readFileSync('./test/support/jsonFile', 'utf8');
      lokijs.insertSchemaToDB(JSON.parse(jsonFile));
      const checkData = schemaPtr.data[0];

      expect(checkData.xmlns).to.eql(insertedObject.xmlns);
      expect(checkData.time).to.eql(insertedObject.time);
      expect(checkData.uuid).to.eql(insertedObject.uuid);
      expect(checkData.device).to.eql(insertedObject.device);
    });
  });
});


describe('getId()', () => {
  describe('checks the schema for each dataItemName', () => {
    it('gives the Id if present', () => {
      expect(lokijs.getId(uuid, 'avail')).to.eql('dtop_2');
      expect(lokijs.getId(uuid, 'estop')).to.eql('dtop_3');
    });
  });
});


// test - compareschema()

describe('compareSchema()', () => {
  describe('checks the database for duplicate entry', () => {
    it('with duplicate entry', () => {
      const check = lokijs.compareSchema(ioEntries.schema, sameJSON);
      expect(check).to.eql(true);
    });
    it('without duplicate entry', () => {
      const check = lokijs.compareSchema(ioEntries.schema, differentJSON);
      const check1 = lokijs.compareSchema(ioEntries.schemaTimeDiff, sameJSON);
      expect(check).to.eql(false);
      expect(check1).to.eql(false);
    });
  });
});


describe('searchDeviceSchema()', () => {
  describe('checks the database for the latest', () => {
    it('device schema present for given uuid', () => {
      schemaPtr.clear();
      const xml1 = fs.readFileSync('./test/support/Devices2di.xml', 'utf8');
      lokijs.updateSchemaCollection(xml1);
      const schema = lokijs.searchDeviceSchema(uuid);
      const refSchema = ioEntries.schema[0];
      return expect(schema[0].device).to.eql(refSchema.device);
    });
  });
});


describe('On receiving new dataitems dataCollectionUpdate()', () => {
  describe('inserts to database and update circular buffer', () => {
    const schema = fs.readFileSync('./test/support/Devices2di.xml', 'utf8');
    const cb = dataStorage.circularBuffer;
    it('with number of dataItem less than buffer size', () => {
      schemaPtr.clear();
      lokijs.updateSchemaCollection(schema);
      dataStorage.circularBuffer.empty();
      lokijs.dataCollectionUpdate(result1);
      const check1Obj = cb.toArray();
      expect(check1Obj[0].dataItemName).to.eql(dbResult1[0].dataItemName);
      expect(check1Obj[0].id).to.eql(dbResult1[0].id);
      expect(check1Obj[0].uuid).to.eql(dbResult1[0].uuid);
      return expect(check1Obj[0].value).to.eql(dbResult1[0].value);
    });
    it('with number of dataItem more than buffer size', () => {
      dataStorage.circularBuffer.empty();
      lokijs.dataCollectionUpdate(input1);
      const check2Obj = cb.toArray();
      expect(check2Obj[0].value).to.eql('FIRST');
      expect(check2Obj[9].value).to.eql('LAST');
      schemaPtr.clear();
    });
  });
});


describe('On receiving a device schema', () => {
  describe('updateSchemaCollection()', () => {
    it('adds a new device schema', () => {
      const schemaEntries = schemaPtr.data.length;
      const schema = fs.readFileSync('./test/support/VMC-3Axis.xml', 'utf8');
      lokijs.updateSchemaCollection(schema);
      return expect(schemaPtr.data.length).to.eql(schemaEntries + 1);
    });
    it('ignores if the schema already exist', () => {
      const schemaEntries = schemaPtr.data.length;
      const schema = fs.readFileSync('./test/support/VMC-3Axis.xml', 'utf8');
      lokijs.updateSchemaCollection(schema);
      return expect(schemaPtr.data.length).to.eql(schemaEntries);
    });
    it('adds a new entry if it is an updated schema', () => {
      const schemaEntries = schemaPtr.data.length;
      const schema = fs.readFileSync('./test/support/VMC-3Axis-copy.xml', 'utf8');
      lokijs.updateSchemaCollection(schema);
      expect(schemaPtr.data.length).to.eql(schemaEntries + 1);
      schemaPtr.clear();
      rawData.clear();
    });
  });
});


describe('Parsing the device schema for dataitems and components',() => {
  describe('and insert the dataitems into the rawData Collection', () => {
    it('with UNAVAILABLE as the default value', () => {
      schemaPtr.clear();
      rawData.clear();
      const jsonFile = fs.readFileSync('./test/support/VMC-3Axis.json', 'utf8');
      lokijs.insertSchemaToDB(JSON.parse(jsonFile));
      expect(rawData.maxId).to.eql(44);
      rawData.clear();
      schemaPtr.clear();
    });
  });
});

describe('getDataItem()', () => {
  describe('get all the DataItems from the ', () => {
    it('latest device schema for given uuid', () => {
      schemaPtr.clear();
      rawData.clear();
      const jsonFile = fs.readFileSync('./test/support/VMC-3Axis.json', 'utf8');
      lokijs.insertSchemaToDB(JSON.parse(jsonFile));
      const dataItemsArr = lokijs.getDataItem('000');
      expect(dataItemsArr.length).to.eql(44);
      schemaPtr.clear();
      rawData.clear();
    });
  });
});


describe('hashCurrent()', () => {
  describe('is updated on each data insertion', () => {
    it('and has UNVAILABLE as value initially', () => {
      schemaPtr.clear();
      dataStorage.hashCurrent.clear();
      const jsonFile = fs.readFileSync('./test/support/jsonFile', 'utf8');
      lokijs.insertSchemaToDB(JSON.parse(jsonFile));
      const hC = dataStorage.hashCurrent;
      const dataItem1 = hC.get('dtop_2');
      const dataItem2 = hC.get('dtop_3');
      expect(dataItem1.value).to.eql('UNAVAILABLE');
      expect(dataItem2.value).to.eql('UNAVAILABLE');
    });
    it('Recent value is updated on receiving raw data from adapter', () =>{
      rawData.insert({sequenceId:2, uuid:'000', id:'dtop_2', time:'2013-02-11T12:12:57Z', value:'AVAILABLE' });
      rawData.insert({sequenceId:3, uuid:'000', id:'dtop_3', time:'2013-02-11T12:12:57Z', value:'TRIGGERED' });
      const hC = dataStorage.hashCurrent;
      const dataItem1 = hC.get('dtop_2');
      const dataItem2 = hC.get('dtop_3');
      expect(dataItem1.value).to.eql('AVAILABLE');
      expect(dataItem2.value).to.eql('TRIGGERED');
      schemaPtr.clear();
    });
  });
});
