from wsgiref.util import setup_testing_defaults
from wsgiref.simple_server import make_server
import json
import time

def location_list(env):
  #time.sleep(10)
  locations = [{"extId": "AUB01"}, {"extId": "AUB02"}]
  return json.dumps(locations)
  
def individual_list(env):
  time.sleep(2)
  locs = json.loads(env["wsgi.input"].read(int(env.get('CONTENT_LENGTH', '0')))[5:])
  resp = []
  for loc in locs:
    if loc == "AUB01":
      indivs = []
      indivs.append({"firstName": "Dave", "lastName": "Roberge", "gender": "M", "dob": "05/05/90"})
    resp.append({"location": loc, "individuals": indivs })
  return json.dumps(resp)
  
def timeoutTest():
  time.sleep(10)
  return "Timeout"

# A relatively simple WSGI application. It's going to print out the
# environment dictionary after being updated by setup_testing_defaults
def simple_app(environ, start_response):
  status = '200 OK'
  served_urls = {
    "/location-list": location_list,
    "/test-here": timeoutTest,
    "/individuals": individual_list
    }
  headers = []

  if served_urls.has_key(environ["PATH_INFO"]):
    status = '200 OK'
    headers.append(('Content-type', 'application/json'))
    func = served_urls.get(environ["PATH_INFO"])
    ret = func(environ)
  else:
    if environ["PATH_INFO"] == "/" or environ["PATH_INFO"] == "":
      f = open("index.html", "r")
      ret = f.readlines()
      f.close()
    else:
      try:
        f = open(environ["PATH_INFO"][1:], "rb")
        ret = f.readlines()
        f.close()
        status = '200 OK'
      except:
        status = "404 Not Found"
        ret = ""

  start_response(status, headers)

  return ret

httpd = make_server('', 8000, simple_app)
print "Serving on port 8000..."
httpd.serve_forever()