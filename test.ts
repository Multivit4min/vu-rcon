import { Battlefield3 } from "./src/Battlefield3"

Battlefield3.connect({ 
  host: "94.250.199.210",
  port: 47200,
  password: "6dBx3Y95"
}).then(async bf3 => {

  bf3.on("playerJoin", ({ name }) => bf3.say(`${name} is joining the game...`))
  bf3.on("playerLeave", event => console.log({ event }))
  console.log("playerList", await bf3.listPlayers())
  console.log("initialized")

})