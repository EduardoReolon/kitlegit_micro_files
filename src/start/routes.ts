// import { HttpContextContract } from "../contracts/requestsContracts";
import Route from "../kernel/routehandler";

// Route.group([
//   Route.post('update/:id', 'AuthController.update'),
//   Route.group([
//     Route.get('me/', 'AuthController.me'),
//   ]),
// ])
//   .prefix('/api/v1/auth/')
//   .middleware(['Auth']);

// Route.get('*', async ({params, response}: HttpContextContract) => {response.status(201).send(params)})

Route.group([
  Route.post('', 'QrcodeController.store'),
  Route.post('fromimg', 'QrcodeController.getFromImg'),
])
  .prefix('api/v1/qrcode').middleware('AwsS3Settings')

Route.group([
  Route.post('fromimg', 'BarcodeController.getFromImg'),
])
  .prefix('api/v1/barcode').middleware('AwsS3Settings')

Route.group([
  Route.post('resize', 'ImgController.resize'),
  Route.post('watermark', 'ImgController.watermark'),
  Route.get('squareToDataURL', 'ImgController.squareToDataURL')
])
  .prefix('api/v1/img').middleware('AwsS3Settings')

Route.group([
  Route.post('', 'PdfController.store'),
])
  .prefix('api/v1/pdf').middleware('AwsS3Settings')

export default Route.solveRoutes();
