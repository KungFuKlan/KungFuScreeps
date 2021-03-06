import {
    CLAIM_FLAG,
    REMOTE_FLAG,
    OVERRIDE_D_ROOM_FLAG,
    ERROR_WARN,
    STIMULATE_FLAG,
    UserException,
    MemoryApi_Empire,
    MemoryApi_Room
} from "Utils/Imports/internals";
import _ from "lodash";

export class EmpireHelper {
    /**
     * finds the closest colonized room to support a
     * Remote/Attack/Claim room
     * Calls helper functions to decide auto or over-ride
     * @param targetRoom the room we want to support
     */
    public static findDependentRoom(targetRoom: string): string {
        // Green & White flags are considered override flags, get those and find the one that was placed most recently
        // ! - Idea for here... going to add a constant to describe each flag type, then we can make an empire api function
        // that returns the flag type, so this next line could be replaced with (flag: Flag) => this.getFlagType === OVERRIDE_FLAG
        const allOverrideFlags = MemoryApi_Empire.getAllFlags(
            (flag: Flag) => flag.color === COLOR_GREEN && flag.secondaryColor === COLOR_WHITE
        );
        let overrideFlag: Flag | undefined;

        // If we don't have any d-room override flags, we don't need to worry about it and will use auto room detection
        if (allOverrideFlags.length > 0) {
            for (const flag of allOverrideFlags) {
                if (!overrideFlag) {
                    overrideFlag = flag;
                } else {
                    if (flag.memory.timePlaced > overrideFlag.memory.timePlaced) {
                        overrideFlag = flag;
                    }
                }
            }

            // Set the override flag as complete and call the helper to find the override room
            Memory.flags[overrideFlag!.name].complete = true;
            return this.findDependentRoomManual(overrideFlag!);
        }

        // If no override flag was found, automatically find closest dependent room
        return this.findDependentRoomAuto(targetRoom);
    }

    /**
     * Automatically come up with a dependent room
     * @param targetRoom the room we want to support
     */
    public static findDependentRoomAuto(targetRoom: string): string {
        const ownedRooms = MemoryApi_Empire.getOwnedRooms((r: Room) => r.controller?.level! > 4);
        let shortestPathRoom: Room | undefined;

        // Loop over owned rooms, finding the shortest path
        for (const currentRoom of ownedRooms) {
            if (!shortestPathRoom) {
                shortestPathRoom = currentRoom;
                continue;
            }

            const shortestPath = Game.map.findRoute(shortestPathRoom.name, targetRoom) as Array<{
                exit: ExitConstant;
                room: string;
            }>;
            const currentPath = Game.map.findRoute(currentRoom.name, targetRoom) as Array<{
                exit: ExitConstant;
                room: string;
            }>;

            // If the path is shorter, its the new canidate room
            if (currentPath.length < shortestPath.length) {
                shortestPathRoom = currentRoom;
            }
        }

        // Throw exception if no rooms were found
        if (!shortestPathRoom) {
            throw new UserException(
                "Auto-Dependent Room Finder Error",
                "No room with shortest path found to the target room.",
                ERROR_WARN
            );
        }

        return shortestPathRoom!.name;
    }

    /**
     * Manually get the dependent room based on flags
     * @param targetRoom the room we want to support
     * @param overrideFlag the flag for the selected override flag
     */
    public static findDependentRoomManual(overrideFlag: Flag): string {
        // Throw error if we have no vision in the override flag room
        // (Shouldn't happen, but user error can allow it to occur)
        if (!Game.flags[overrideFlag.name].room) {
            throw new UserException(
                "Manual Dependent Room Finding Error",
                "Flag [" +
                overrideFlag.name +
                "]. We have no vision in the room you attempted to manually set as override dependent room.",
                ERROR_ERROR
            );
        }
        return Game.flags[overrideFlag.name].room!.name;
    }

    /**
     * get the rally location for the room we are attacking
     * @param homeRoom the room we are spawning from
     * @param targetRoom the room we are attacking
     */
    public static findRallyLocation(homeRoom: string, targetRoom: string): RoomPosition {
        const fullPath = Game.map.findRoute(homeRoom, targetRoom) as Array<{ exit: ExitConstant; room: string }>;

        if (fullPath.length <= 2) {
            return new RoomPosition(25, 25, homeRoom);
        }

        // Return the room right BEFORE the room we are attacking. This is the rally room (location is just in middle of room)
        return new RoomPosition(25, 25, fullPath[fullPath.length - 2].room);
    }

    /**
     * Mark the flag as complete for each claim room that is considered "built"
     * @param claimRooms the claim rooms we are checking in memory
     */
    public static markCompletedClaimRooms(claimRooms: Array<ClaimRoomMemory | undefined>): void {
        for (const claimRoom of claimRooms) {
            if (!claimRoom) continue;
            if (claimRoom.buildComplete) continue;

            // If the room is built, complete all the flags associated with it
            if (this.claimRoomBuildComplete(claimRoom)) {
                claimRoom.buildComplete = true;

                // Destroy all the structures in the claim room EXCEPT our spawn
                const room: Room = Game.rooms[claimRoom.roomName];
                if (room) {
                    room.find(FIND_HOSTILE_SPAWNS).forEach((struct: AnyOwnedStructure) => struct.destroy());
                    room.find(FIND_STRUCTURES, {
                        filter: (struct: AnyStructure) => struct.structureType !== STRUCTURE_SPAWN
                    }).forEach((struct: AnyStructure) => struct.destroy());
                }
            }
        }
    }

    /**
     * Checks if the current claim room is considered "built"
     * @param claimRoom the claim room we are checking
     * @returns boolean represeting its status as built or unbuilt
     */
    public static claimRoomBuildComplete(claimRoom: ClaimRoomMemory): boolean {
        const room: Room | undefined = Game.rooms[claimRoom.roomName];
        // If we have no vision, assume build is not complete
        if (!room) {
            return false;
        }

        const spawns = MemoryApi_Room.getStructureOfType(
            room.name,
            STRUCTURE_SPAWN,
            (struct: StructureSpawn) => struct.my
        );
        return spawns.length > 0;
    }

    /**
     * gets the flag type for a flag
     * @param flag the flag we are checking the type for
     * @returns the flag type constant that tells you the type of flag it is
     */
    public static getFlagType(flag: Flag): FlagTypeConstant | undefined {
        let flagType: FlagTypeConstant | undefined;
        // Claim Flags
        if (flag.color === COLOR_WHITE) {
            flagType = CLAIM_FLAG;
        }
        // Option Flags
        else if (flag.color === COLOR_GREEN) {
            // Check the subtype
            switch (flag.secondaryColor) {
                // Depedent Room Override Flag
                case COLOR_WHITE:
                    flagType = OVERRIDE_D_ROOM_FLAG;
                    break;

                case COLOR_YELLOW:
                    flagType = STIMULATE_FLAG;
            }
        }
        // Remote Flags
        else if (flag.color === COLOR_YELLOW) {
            flagType = REMOTE_FLAG;
        }

        // Unknown Flag Type
        else {
            // If it isn't a valid flag type, set it to complete to flag it for deletion and throw a warning
            Memory.flags[flag.name].complete = true;
            throw new UserException("Invalid flag type", "The flag you placed has no defined type.", ERROR_WARN);
        }

        return flagType;
    }
}
