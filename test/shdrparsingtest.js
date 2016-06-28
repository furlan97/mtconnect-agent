// Imports - External

const expect = require('expect.js');
const fs = require('fs');
// const util = require('util');
const R = require('ramda');

// Imports - Internal

const ioentries = require('./checkfiles/ioentries');
const dataStorage = require('../src/dataStorage');
const lokijs = require('../src/lokijs');
const common = require('../src/common');
// constants

const uuid = '000';
const shdrstring2 = '2014-08-13T07:38:27.663Z|execution|UNAVAILABLE|line|' +
                  'UNAVAILABLE|mode|UNAVAILABLE|' +
                  'program|UNAVAILABLE|Fovr|UNAVAILABLE|Sovr|UNAVAILABLE|' +
                  'sub_prog|UNAVAILABLE|path_pos|UNAVAILABLE';
const shdrstring1 = '2014-08-11T08:32:54.028533Z|avail|AVAILABLE';
const shdrstring3 = '2016-04-12T20:27:01.0530|logic1|NORMAL||||';

const result1 = { time: '2014-08-11T08:32:54.028533Z',
dataitem: [{ name: 'avail', value: 'AVAILABLE' }] };

const result2 = { time: '2014-08-13T07:38:27.663Z',
  dataitem:
   [{ name: 'execution', value: 'UNAVAILABLE' },
     { name: 'line', value: 'UNAVAILABLE' },
     { name: 'mode', value: 'UNAVAILABLE' },
     { name: 'program', value: 'UNAVAILABLE' },
     { name: 'Fovr', value: 'UNAVAILABLE' },
     { name: 'Sovr', value: 'UNAVAILABLE' },
     { name: 'sub_prog', value: 'UNAVAILABLE' },
     { name: 'path_pos', value: 'UNAVAILABLE' }] };

const result3 = { time: '2016-04-12T20:27:01.0530',
  dataitem: [{ name: 'logic1', value: 'NORMAL' }] };

const input1 = ioentries.input1;
const output1 = ioentries.output1;
const dbresult1 = [{ dataItemName: 'avail',
                uuid: '000',
                id: 'dtop_2',
                value: 'AVAILABLE' }];


describe('shdr parsing', () => {
  describe('inputParsing()', () => {
    it('should parse shdr with single dataitem correctly', () =>
      expect(common.inputParsing(shdrstring1)).to.eql(result1)
    );
    it('should parse shdr with multiple dataitem correctly', () =>
      expect(common.inputParsing(shdrstring2)).to.eql(result2)
    );
    it('should parse shdr with single dataitem and empty pipes correctly', () =>
      expect(common.inputParsing(shdrstring3)).to.eql(result3)
    );
  });
});

describe('To get Uuid', () => {
  describe('getUuid()', () => {
    it('should return the uuid correctly', () =>
      expect(common.getUuid()).to.eql(uuid)
    );
  });
});

describe('To get Id', () => {
  describe('getId()', () => {
    it('should give correct Id', () => {
      expect(lokijs.getId(uuid, 'avail')).to.eql('dtop_2');
      expect(lokijs.getId(uuid, 'estop')).to.eql('dtop_3');
    });
  });
});

// TODO edit the test

describe('datainsertion', () => {
  describe('dataCollectionUpdate()', () => {
    const schema = fs.readFileSync('./test/checkfiles/Devices2di.xml', 'utf8');
    lokijs.updateSchemaCollection(schema);
    it('should insert single dataitem in database and update circular buffer', () => {
      dataStorage.circularBuffer.clear();
      const check1 = lokijs.dataCollectionUpdate(result1);
      const check1Obj = check1.toObject();
      const buffer1 = R.values(check1Obj);
      return expect(buffer1).to.eql(dbresult1);
    });
    it('should insert more than 10 dataitem in database and update circular buffer', () => {
      dataStorage.circularBuffer.clear();
      const check2 = lokijs.dataCollectionUpdate(input1);
      const check2Obj = check2.toObject();
      const buffer2 = R.values(check2Obj);
      return expect(buffer2).to.eql(output1);
    });
  });
});
