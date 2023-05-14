import sys
import storage
import img

params = {}

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
    values = getattr(img, params['func'])(params)
    print(values)
