/*
  Kung Fu Klan's Screeps Code
  Written and maintained by -
    Jakesboy2
    UhmBrock

  Starting Jan 2019
*/

// ------ end imports
// @ts-ignore
import ConsoleCommands from "Helpers/ConsoleCommands";
// @ts-ignore
import EmpireManager from "Managers/EmpireManager";
// @ts-ignore
import MemoryManager from "Managers/MemoryManagement";
// @ts-ignore
import RoomManager from "Managers/RoomManager";
// @ts-ignore
import SpawnManager from "Managers/SpawnManager";
// @ts-ignore
import { ErrorMapper } from "utils/ErrorMapper";
// @ts-ignore
import UtilHelper from "Helpers/UtilHelper";

import { ERROR_FATAL, ERROR_ERROR, ERROR_INFO, ERROR_WARN } from "utils/Constants";

export const loop = ErrorMapper.wrapLoop(() => {
    try {
        // clean up memory first
        MemoryManager.runMemoryManager();

        // run the empire and get all relevant info from that into memory
        EmpireManager.runEmpireManager();

        // run rooms
        RoomManager.runRoomManager();

        // run spawning
        SpawnManager.runSpawnManager();
    } catch (e) {
        UtilHelper.printError(e);
    }
    // -------- end managers --------
});
