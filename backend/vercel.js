// {
//   "builds": [
//     {
//       "src": "./server.js",
//       "use": "@vercel/node"
//     }
//   ],
//     "routes": [
//       {
//         "src": "/api/(.*)",
//         "dest": "server.js"
//       },

//     ]
// }



{
  "rewrites": [
      {"source": "/(.*)", "destination": "/"}
  ]
}