import sys
import json
import zmq  # https://zeromq.org/languages/python/
params = {}


class BytesEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, bytes):
            return obj.decode('utf-8')
        return json.JSONEncoder.default(self, obj)


currentKey = ''
for arg in sys.argv[1:]:
    if (len(arg) < 1):
        continue
    if (arg.startswith('--')):
        currentKey = arg[2:]
    elif (len(currentKey) > 1 and currentKey not in params):
        params[currentKey] = arg


def apply(params):
    if (params['target'] == 'storage'):
        import storage
        img = getattr(storage, params['func'])(params)
        return img.shape
    elif params['target'] == 'img':
        import img
        # raise Exception('any')
        values = getattr(img, params['func'])(params)
        return json.dumps(values, cls=BytesEncoder)


if ('connectionMethod' not in params or params['connectionMethod'] == 'socket'):
    context = zmq.Context()
    socket = context.socket(zmq.REP)
    socket.bind("tcp://*:5555")

    while True:
        try:
            message = socket.recv()
            req = json.loads(message)

            values = apply(req)
            socket.send_json(json.dumps(values, cls=BytesEncoder))
        except:
            socket.send_string('error')
else:
    print(apply(params))
# elif (params['target'] == 'storage'):
#     img = getattr(storage, params['func'])(params)
#     print(type(img))
#     print(img.shape)
# elif params['target'] == 'img':
#     # raise Exception('any')
#     values = getattr(img, params['func'])(params)
#     print(json.dumps(values, cls=BytesEncoder))
