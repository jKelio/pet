# PET — Practice Efficiency Tracking

Domain language for tracking ice-hockey practice efficiency. Coaches log timing and count data per drill during a training session.

## Language

### Time tracking

**Time Moving**:
The total time the tracked player is actively moving during a drill. It is the sum of `with Puck` + `without Puck`, not a separately running timer.

**with Puck**:
A timer for the time the tracked player is moving in possession of the puck. Started by the `with Puck` action (a Reception). Mutually exclusive with `without Puck` — only one of the two runs at a time; starting one stops the other.

**without Puck**:
A timer for the time the tracked player is moving without possession of the puck. Started by the `without Puck` action, or automatically by a `Pass`, `Shot`, or Turnover. Mutually exclusive with `with Puck`.
_Note_: `with Puck` + `without Puck` == `Time Moving` (a partition into two timers).

**Reception**:
The act of the tracked player gaining possession (a received pass or a picked-up loose puck). Realised by starting the `with Puck` timer. Not separately counted.
_Avoid_: Pickup, gain puck.

**Turnover**:
The tracked player losing possession *without* a pass or shot (e.g. a check or a mishandle). Realised by starting the `without Puck` timer while `with Puck` is running.
_Avoid_: Loss, giveaway.

**Time-Moving-Episode**:
One continuous movement bout of the tracked player, made up of adjacent `with Puck` and `without Puck` children. It ends when neither puck timer is running (the player stops moving) and a new one begins when movement resumes. A drill may contain several. Episodes are *derived* from the children's timestamps, not stored.
_Avoid_: Segment (reserved for a single timer start/stop interval), bout.
