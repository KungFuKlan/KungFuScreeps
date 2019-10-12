import { ROLE_MINERAL_MINER, MemoryApi, CreepApi, CreepHelper } from "utils/internals";

// Manager for the miner creep role
export class MineralMinerCreepManager implements ICivCreepRoleManager {
    public name: RoleConstant = ROLE_MINERAL_MINER;

    constructor() {
        const self = this;
        self.runCreepRole = self.runCreepRole.bind(this);
    }

    /**
     * Run the miner creep
     * @param creep The creep to run
     */
    public runCreepRole(creep: Creep): void {
        const homeRoom: Room = Game.rooms[creep.memory.homeRoom];

        if (creep.memory.job === undefined) {
            creep.memory.job = this.getNewJob(creep, homeRoom);

            if (creep.memory.job === undefined) {
                return; // idle for a tick
            }

            // Set supplementary.moveTarget to container if one exists and isn't already taken
            this.handleNewJob(creep, homeRoom);
        }

        if (creep.memory.job) {
            if (creep.memory.working) {
                CreepApi.doWork(creep, creep.memory.job);
                return;
            }

            CreepApi.travelTo(creep, creep.memory.job);
        }
    }

    /**
     * Decides which kind of job to get and calls the appropriate function
     * @param creep the creep we are getting the job for
     * @param room the room we are in
     * @returns BaseJob of the new job we recieved (undefined if none)
     */
    public getNewJob(creep: Creep, room: Room): BaseJob | undefined {
        return CreepApi.getNewMineralJob(creep, room);
    }

    /**
     * Handle initalizing a new job
     */
    public handleNewJob(creep: Creep, room: Room): void {
        // Update room memory to reflect the new job
        MemoryApi.updateJobMemory(creep, room);
        const isSource: boolean = false;
        const miningContainer = CreepHelper.getMiningContainer(
            creep.memory.job as GetEnergyJob,
            Game.rooms[creep.memory.homeRoom],
            isSource
        );

        if (miningContainer === undefined) {
            // Returning here to prevent supplementary id from being formed,
            // so in that case creep will just walk up to the source
            return;
        }

        if (creep.memory.supplementary === undefined) {
            creep.memory.supplementary = {};
        }

        creep.memory.supplementary.moveTargetID = miningContainer.id;
    }
}
