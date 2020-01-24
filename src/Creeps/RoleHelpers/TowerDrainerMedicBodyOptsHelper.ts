import {
    GROUPED,
    ROOM_STATE_INTRO,
    ROOM_STATE_BEGINNER,
    ROOM_STATE_INTER,
    ROOM_STATE_ADVANCED,
    ROOM_STATE_NUKE_INBOUND,
    ROOM_STATE_STIMULATE,
    ROOM_STATE_UPGRADER,
    TIER_1,
    TIER_2,
    TIER_3,
    TIER_4,
    TIER_5,
    TIER_6,
    TIER_7,
    TIER_8,
    ROLE_TOWER_MEDIC,
    ERROR_ERROR
} from "Utils/Imports/constants";
import { SpawnHelper, UserException, SpawnApi, MemoryApi_Room } from "Utils/Imports/internals";

export class TowerDrainerMedicBodyOptsHelper implements ICreepBodyOptsHelper {
    public name: RoleConstant = ROLE_TOWER_MEDIC;

    constructor() {
        const self = this;
        self.generateCreepBody = self.generateCreepBody.bind(self);
        self.generateCreepOptions = self.generateCreepOptions.bind(this);
    }

    /**
     * Generate body for zealot creep
     * @param tier the tier of the room
     */
    public generateCreepBody(tier: TierConstant, room: Room): BodyPartConstant[] {
        // Default Values for Zealot
        let body: CreepBodyDescriptor = { work: 0, move: 0 };
        const opts: CreepBodyOptions = { mixType: GROUPED };

        switch (tier) {
            case TIER_4: // Total Cost: 1100
                body = { heal: 4, move: 2 };
                break;

            case TIER_5: // Total Cost: 1700
                body = { heal: 6, move: 4 };
                break;

            case TIER_6: // Total Cost: 2300
                body = { heal: 8, move: 6 };
                break;

            case TIER_7: // Total Cost: 3400
                body = { heal: 12, move: 8 };
                break;

            case TIER_8: // Total Cost: 3750
                body = { heal: 13, move: 10 };
                break;
        }

        // ! Important DONT FORGET TO CHANGE
        // Temp override
        // body = { attack: 1, move: 1 };
        // Generate creep body based on body array and options
        return SpawnApi.createCreepBody(body, opts);
    }

    /**
     * Generate options for zealot creep
     * @param roomState the room state of the room
     * @param squadSizeParam the size of the squad associated with the zealot
     * @param squadUUIDParam the squad id that the zealot is a member of
     * @param rallyLocationParam the meeting place for the squad
     */
    public generateCreepOptions(
        roomState: RoomStateConstant,
        squadSizeParam: number,
        squadUUIDParam: number | null,
        rallyLocationParam: RoomPosition | null
    ): CreepOptionsMili | undefined {
        let creepOptions: CreepOptionsMili = SpawnHelper.getDefaultCreepOptionsMili();
        // TODO impelmeent
        return creepOptions;
    }

    /**
     * get the target room for the tower drainer tank
     * @param room the room we are spawning in
     * @param roleConst the role of the creep spawning
     * @param creepBody the body of the creep
     * @param creepName the name of the creep spawning
     */
    public getTargetRoom(
        room: Room,
        roleConst: RoleConstant,
        creepBody: BodyPartConstant[],
        creepName: string
    ): string {
        // TODO impelmeent

        // Throw exception if we couldn't find a definite room memory
        throw new UserException(
            "Couldn't get target room for [" + roleConst + " ]",
            "room: [ " + room.name + " ]",
            ERROR_ERROR
        );
    }

    /**
     * get the home room for the tower drainer tank
     * @param room the room the creep is spawning in
     */
    public getHomeRoom(room: Room): string {
        return room.name;
    }

    /**
     * get the direction of the spawn the drainer should use
     * @param centerSpawn the center spawn of the bunker
     * @param room the room we are spawning in
     */
    public getSpawnDirection(centerSpawn: StructureSpawn, room: Room): DirectionConstant[] {
        const roomCenter: RoomPosition = MemoryApi_Room.getBunkerCenter(room, false);
        const directions: DirectionConstant[] = [
            TOP,
            TOP_RIGHT,
            RIGHT,
            BOTTOM_RIGHT,
            BOTTOM,
            BOTTOM_LEFT,
            LEFT,
            TOP_LEFT
        ];
        const managerDirection: DirectionConstant = centerSpawn.pos.getDirectionTo(roomCenter!.x, roomCenter!.y);
        directions.splice(directions.indexOf(managerDirection), 1);
        return directions;
    }
}
