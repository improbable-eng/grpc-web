module.exports = require("protobufjs").newBuilder({})['import']({
    "package": "mwitkow.testproto",
    "messages": [
        {
            "name": "Empty",
            "fields": []
        },
        {
            "name": "PingRequest",
            "fields": [
                {
                    "rule": "optional",
                    "type": "string",
                    "name": "value",
                    "id": 1
                },
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "sleepTimeMs",
                    "id": 2
                },
                {
                    "rule": "optional",
                    "type": "uint32",
                    "name": "errorCodeReturned",
                    "id": 3
                }
            ]
        },
        {
            "name": "PingResponse",
            "fields": [
                {
                    "rule": "optional",
                    "type": "string",
                    "name": "Value",
                    "id": 1
                },
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "counter",
                    "id": 2
                },
                {
                    "rule": "optional",
                    "type": "boo.Boo",
                    "name": "boo",
                    "id": 3
                }
            ]
        },
        {
            "name": "boo",
            "fields": [],
            "messages": [
                {
                    "name": "Boo",
                    "fields": [
                        {
                            "rule": "optional",
                            "type": "string",
                            "name": "value",
                            "id": 1
                        }
                    ]
                }
            ]
        }
    ],
    "services": [
        {
            "name": "TestService",
            "options": {},
            "rpc": {
                "PingEmpty": {
                    "request": "Empty",
                    "response": "PingResponse",
                    "options": {}
                },
                "Ping": {
                    "request": "PingRequest",
                    "response": "PingResponse",
                    "options": {}
                },
                "PingError": {
                    "request": "PingRequest",
                    "response": "Empty",
                    "options": {}
                },
                "PingList": {
                    "request": "PingRequest",
                    "response": "PingResponse",
                    "options": {}
                }
            }
        }
    ]
}).build();