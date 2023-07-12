import sys
import storage
import img
import json
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

if (params['target'] == 'storage'):
    img = getattr(storage, params['func'])(params)
    print(type(img))
    print(img.shape)
elif params['target'] == 'img':
    # raise Exception('any')
    values = getattr(img, params['func'])(params)
    print(json.dumps(values, cls=BytesEncoder))
