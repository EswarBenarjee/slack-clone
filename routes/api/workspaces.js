const express = require("express");
const router = express.Router();

const { check, validationResult } = require("express-validator");

const User = require("../../models/User");
const Channel = require("../../models/Channel");
const Workspace = require("../../models/Workspace");

const jwt = require("jsonwebtoken");

const config = require("config");

const workspaceInvite = require("../../middleware/workspace-invite");

const isWorkspaceAdmin = require("../utils/isWorkspaceAdmin.js");

// route    GET  /api/workspaces/:id
// @desc    Get Workspace Details
// @access  PRIVATE -> ALL Users
router.get("/:id", (req, res) => {
  const id = req.params.id;

  Workspace.findById(id)
    .then((workspace) => {
      return res.json({ workspace });
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ errors: [{ msg: "Internal Server Error" }] });
    });
});

// route    POST /api/workspaces
// @desc    Create Workspace
// @access  PRIVATE -> ALL Users
router.post(
  "/",
  [
    check("name", "Workspace name is required").not().isEmpty(),
    check("logo", "Logo is required").not().isEmpty(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, logo } = req.body;

    const newChannel = new Channel({
      name: config.get("commonChannel"),
      logo: "general.png",
      createdBy: req.user.id,
      users: [req.user.id],
      admins: [req.user.id],
    });

    newChannel
      .save()
      .then((savedChannel) => {
        const newWorkspace = new Workspace({
          name,
          logo,
          createdBy: req.user.id,
          channels: [savedChannel._id],
          users: [req.user.id],
          admins: [req.user.id],
        });

        newWorkspace
          .save()
          .then((savedWorkspace) => {
            User.findById(req.user.id)
              .then((user) => {
                user.workspaces.unshift(savedWorkspace._id);

                user
                  .save()
                  .then((savedUser) => {
                    return res.json({ workspace: savedWorkspace });
                  })
                  .catch((err) => {
                    return res.status(500);
                    s.json({ errors: [{ msg: "Internal Server Error" }] });
                  });
              })
              .catch((err) => {
                return res
                  .status(500)
                  .json({ errors: [{ msg: "Internal Server Error" }] });
              });
          })
          .catch((err) => {
            return res
              .status(500)
              .json({ errors: [{ msg: "Internal Server Error" }] });
          });
      })
      .catch((err) => {
        return res
          .status(500)
          .json({ errors: [{ msg: "Internal Server Error" }] });
      });
  }
);

// route    PUT /api/workspaces/:id
// @desc    Update Workspace
// @access  PRIVATE -> Admins
router.put("/:id", (req, res) => {
  const id = req.params.id;
  const { name, logo } = req.body;

  // Check if current user is admin or not
  if (!isWorkspaceAdmin(id, req.user.id)) {
    return res.status(401).json({ errors: [{ msg: "Unauthorized Access" }] });
  }

  const workspaceFields = {};
  if (name) workspaceFields.name = name;
  if (logo) workspaceFields.logo = logo;

  Workspace.findOneAndUpdate(
    { _id: id },
    { $set: workspaceFields },
    { new: true }
  )
    .then((workspace) => {
      return res.json({ workspace });
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ errors: [{ msg: "Internal Server Error" }] });
    });
});

// route    DELETE /api/workspaces/:id
// @desc    Delete Workspace
// @access  PRIVATE -> Admins
router.delete("/:id", async (req, res) => {
  const workspaceId = req.params.id;

  if (!isWorkspaceAdmin(workspaceId, req.user.id)) {
    return res.status(401).json({ errors: [{ msg: "Unauthorized Access" }] });
  }

  Workspace.findById(workspaceId).then(async (workspace) => {
    // Get all users from workspace and delete the current workspace id in the user
    workspace.users.forEach(async (userId) => {
      const user = await User.findById(userId);
      user.workspaces = user.workspaces.filter((currentWorkspaceId) => {
        return currentWorkspaceId.toLocaleString() !== workspaceId;
      });
      await user.save();
    });

    // Delete all Sub Channels
    workspace.channels.forEach(async (channelId) => {
      await Channel.findOneAndDelete({ _id: channelId });
    });

    // Delete current workspace
    await Workspace.findOneAndDelete({ _id: workspace._id });

    return res.json({
      messages: [{ msg: "Workspace deleted successfully" }],
    });
  });
});

// route    DELETE /api/workspaces/:id/:user
// @desc    Leave/Remove the user by current user
// @access  PRIVATE -> Leave(All)/Remove(Admins)
router.delete("/:id/:user", (req, res) => {
  const { id, user } = req.params;

  Workspace.findById(id)
    .then((workspace) => {
      // Check if remover and user are same or current user is admin or not
      if (req.user.id === user || isWorkspaceAdmin(id, req.user.id)) {
        User.findById(user)
          .select("-encry_password -salt")
          .then((userFetched) => {
            userFetched.workspaces = userFetched.workspaces.filter(
              (currentWorkspaceId) => {
                return currentWorkspaceId.toLocaleString() !== id;
              }
            );

            userFetched
              .save()
              .then((savedUser) => {
                workspace.users = workspace.users.filter((currentUserId) => {
                  return (
                    currentUserId.toLocaleString() !==
                    savedUser._id.toLocaleString()
                  );
                });
                workspace.admins = workspace.admins.filter((currentUserId) => {
                  return (
                    currentUserId.toLocaleString() !==
                    savedUser._id.toLocaleString()
                  );
                });

                workspace
                  .save()
                  .then((savedWorkspace) => {
                    return res.json({
                      messages: [
                        {
                          msg:
                            user === req.user.id
                              ? "Left Workspace successfully"
                              : "Removed user successfully",
                        },
                      ],
                    });
                  })
                  .catch((err) => {
                    return res
                      .status(500)
                      .json({ errors: [{ msg: "Internal Server Error" }] });
                  });
              })
              .catch((err) => {
                return res
                  .status(500)
                  .json({ errors: [{ msg: "Internal Server Error" }] });
              });
          })
          .catch((err) => {
            return res
              .status(500)
              .json({ errors: [{ msg: "Internal Server Error" }] });
          });
      } else {
        return res
          .status(401)
          .json({ errors: [{ msg: "Unauthorized Access" }] });
      }
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ errors: [{ msg: "Internal Server Error" }] });
    });
});

// route    GET /api/workspaces/invite/:id
// @desc    Invite Link Generation
// @access  PRIVATE -> Admins
router.get("/invite/:id", (req, res) => {
  const id = req.params.id;

  Workspace.findById(id)
    .then((workspace) => {
      if (!isWorkspaceAdmin(id, req.user.id)) {
        return res
          .status(401)
          .json({ errors: [{ err: "Unauthorized Access" }] });
      }

      const payload = {
        workspace: {
          id,
        },
      };

      jwt.sign(
        payload,
        config.get("inviteSecret"),
        {
          expiresIn: config.get("inviteValidTime"),
        },
        (err, token) => {
          if (err) {
            return res
              .status(500)
              .json({ errors: [{ err: "Internal Server Error" }] });
          }

          const link = "localhost:5000/api/workspaces/invite/" + token;
          return res.json({ link });
        }
      );
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ errors: [{ err: "Internal Server Error" }] });
    });
});

// route    POST /api/workspaces/invite/:id
// @desc    Invite Link Activation
// @access  PRIVATE - As user must be logged in to join workspace -> All Users
router.post("/invite/:id", [workspaceInvite], (req, res) => {
  const id = req.workspace.id;

  User.findById(req.user.id)
    .select("-encry_password -salt")
    .then((user) => {
      for (let i = 0; i < user.workspaces.length; i++) {
        if (user.workspaces.includes(id)) {
          return res
            .status(400)
            .json({ errors: [{ msg: "User already joined Workspace" }] });
        }
      }

      user.workspaces.unshift(id);

      user
        .save()
        .then((savedUser) => {
          Workspace.findById(id)
            .then((workspace) => {
              workspace.users.unshift(user._id);

              workspace
                .save()
                .then((savedWorkspace) => {
                  const channels = [...savedWorkspace.channels];

                  channels.forEach((channelId) => {
                    Channel.findById(channelId)
                      .then((channel) => {
                        if (channel.name !== config.get("commonChannel"))
                          return;

                        channel.users.unshift(savedUser._id);

                        channel
                          .save()
                          .then((savedChannel) => {
                            return res.json({ user: savedUser });
                          })
                          .catch((err) => {
                            return res.status(500).json({
                              errors: [{ msg: "Internal Server Error" }],
                            });
                          });
                      })
                      .catch((err) => {
                        return res
                          .status(500)
                          .json({ errors: [{ msg: "Internal Server Error" }] });
                      });
                  });
                })
                .catch((err) => {
                  return res
                    .status(500)
                    .json({ errors: [{ msg: "Internal Server Error" }] });
                });
            })
            .catch((err) => {
              return res
                .status(500)
                .json({ errors: [{ msg: "Internal Server Error" }] });
            });
        })
        .catch((err) => {
          return res
            .status(500)
            .json({ errors: [{ msg: "Internal Server Error" }] });
        });
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ errors: [{ msg: "Internal Server Error" }] });
    });
});

// route    POST /api/workspaces/admin/:workspaceId/:id
// @desc    Promote to Admin
// @access  PRIVATE - Admin
router.post("/admin/:workspaceId/:userId", (req, res) => {
  const { workspaceId, userId } = req.params;

  // Check if userId is present in Current workspace users
  Workspace.findById(workspaceId)
    .then((workspace) => {
      if (workspace.admins.includes(userId)) {
        return res.status(401).json({
          errors: [{ msg: "Already an Admin" }],
        });
      }

      if (
        !isWorkspaceAdmin(workspaceId, req.user.id) ||
        !workspace.users.includes(userId)
      ) {
        return res.status(401).json({
          errors: [{ msg: "Unauthorized Access" }],
        });
      }

      workspace.admins.unshift(userId);

      workspace
        .save()
        .then((savedWorkspace) => {
          return res.json({ workspace: savedWorkspace });
        })
        .catch((err) => {
          return res.status(500).json({
            errors: [{ msg: "Internal Server Error" }],
          });
        });
    })
    .catch((err) => {
      return res.status(500).json({
        errors: [{ msg: "Internal Server Error" }],
      });
    });
});

// route    DELETE /api/workspaces/admin/:workspaceId/:id
// @desc    Demote Admin
// @access  PRIVATE - Admin
router.delete("/admin/:workspaceId/:userId", (req, res) => {
  const { workspaceId, userId } = req.params;

  // Check if userId is present in Current workspace users
  Workspace.findById(workspaceId)
    .then((workspace) => {
      if (
        !isWorkspaceAdmin(workspaceId, req.user.id) ||
        !workspace.admins.includes(userId)
      ) {
        return res.status(401).json({
          errors: [{ msg: "Unauthorized Access" }],
        });
      }

      workspace.admins = workspace.admins.filter((id) => {
        return id !== userId;
      });

      if (workspace.admins.length === 0) {
        // As there must be atlease one admin per workspace
        // Make the oldest user as admin
        workspace.admins.unshift(workspace.users[workspace.users.length - 1]);
      }

      workspace
        .save()
        .then((savedWorkspace) => {
          return res.json({ workspace: savedWorkspace });
        })
        .catch((err) => {
          return res.status(500).json({
            errors: [{ msg: "Internal Server Error" }],
          });
        });
    })
    .catch((err) => {
      return res.status(500).json({
        errors: [{ msg: "Internal Server Error" }],
      });
    });
});

module.exports = router;
