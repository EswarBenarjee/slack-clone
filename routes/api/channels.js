const express = require("express");
const router = express.Router();

const { check, validationResult } = require("express-validator");

const User = require("../../models/User");
const Channel = require("../../models/Channel");
const Workspace = require("../../models/Workspace");

const channelInvite = require("../../middleware/channel-invite");

// route    /api/channels/:id
// @desc    Channel Details
// @access  PRIVATE
router.get("/:id", (req, res) => {
  const id = req.params.id;

  Channel.findById(id)
    .then((channel) => {
      return res.json({ channel });
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ errors: [{ msg: "Internal Server Error" }] });
    });
});

// route    POST /api/channels
// @desc    Create Channel
// @access  PRIVATE
router.post(
  "/",
  [
    check("name", "Channel name is required").not().isEmpty(),
    check("logo", "Logo is required").not().isEmpty(),
    check("workspace", "Workspace is required").not().isEmpty(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, logo, workspace } = req.body;

    const newChannel = new Channel({
      name,
      logo,
      workspace,
      createdBy: req.user.id,
      users: [req.user.id],
      admins: [req.user.id],
    });

    newChannel
      .save()
      .then((savedChannel) => {
        Workspace.findById(workspace).then((workspace) => {
          workspace.channels.unshift(savedChannel._id);

          workspace
            .save()
            .then((savedWorkspace) => {
              return res.json({ channel: savedChannel });
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
  }
);

// route    PUT /api/channels/:id
// @desc    Update Channel
// @access  PRIVATE
router.put("/:id", (req, res) => {
  const id = req.params.id;
  const { name, logo } = req.body;

  // Check if current user is admin or not
  Channel.findById(id)
    .then((channel) => {
      if (!channel.admins.includes(req.user.id)) {
        return res
          .status(401)
          .json({ errors: [{ msg: "Unauthorized Access" }] });
      }

      if (name) channel.name = name;
      if (logo) channel.logo = logo;

      channel
        .save()
        .then((savedChannel) => {
          return res.json({ channel: savedChannel });
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

// route    DELETE /api/channels/:id
// @desc    Delete Channel
// @access  PRIVATE
router.delete("/:id", async (req, res) => {
  const id = req.params.id;

  // Check workspace and remove the current Channel from Workspace
  Channel.findById(id)
    .then((channel) => {
      if (!channel.admins.includes(req.user.id)) {
        return res
          .status(401)
          .json({ errors: [{ msg: "Unauthorized access" }] });
      }

      const workspace = channel.workspace;

      Workspace.findById(workspace)
        .then((workspace) => {
          workspace.channels = workspace.channels.filter((channel) => {
            return channel.toLocaleString() !== id.toLocaleString();
          });

          workspace
            .save()
            .then((workspace) => {
              // Delete Channel
              Channel.findOneAndDelete({ _id: id })
                .then(() => {
                  return res.json({
                    messages: [{ msg: "Channel deleted successfully" }],
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

// route    DELETE /api/channels/:id/:user
// @desc    Leave/Remove the user by current user
// @access  PRIVATE -> Leave(All)/Remove(Admins)
router.delete("/:id/:user", (req, res) => {
  const { id, user } = req.params;

  Channel.findById(id)
    .then((channel) => {
      // Check if remover and user are same or current user is admin or not
      if (req.user.id === user || !channel.admins.includes(user)) {
        User.findById(user)
          .select("-encry_password -salt")
          .then((userFetched) => {
            channel.users = channel.users.filter((currentUserId) => {
              return (
                currentUserId.toLocaleString() !==
                savedUser._id.toLocaleString()
              );
            });
            channel.admins = channel.admins.filter((currentUserId) => {
              return (
                currentUserId.toLocaleString() !==
                savedUser._id.toLocaleString()
              );
            });

            if (channel.users.length === 0) {
              Workspace.findById(channel.workspace)
                .then((workspace) => {
                  workspace.channels = workspace.channels.filter((cid) => {
                    return cid.toLocaleString() !== id.toLocaleString();
                  });

                  Channel.findOneAndDelete(id)
                    .then(() => {
                      return res.json({ channel: {} });
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

            channel
              .save()
              .then((savedChannel) => {
                return res.json({
                  messages: [
                    {
                      msg:
                        user === req.user.id
                          ? "Left Channel successfully"
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

// route    POST /api/channels/add/:channelId/:userId
// @desc    Add User
// @access  PRIVATE
router.post("/add/:channelId/:userId", (req, res) => {
  const { channelId, userId } = req.params;

  Channel.findById(channelId)
    .then((channel) => {
      // Check if current user is admin or not
      if (!channel.admins.includes(req.user.id)) {
        return res.status(401).json({
          errors: [{ msg: "Unauthorized Access" }],
        });
      }

      // Check if the user is in workspace and channel or not
      Workspace.findById(channel.workspace)
        .then((workspace) => {
          if (
            !workspace.users.includes(userId) ||
            !channel.users.includes(userId)
          ) {
            return res.status(404).json({
              errors: [{ msg: "User not found in Channel" }],
            });
          }

          channel.unshift(userId);

          channel
            .save()
            .then((savedChannel) => {
              return res.json({ channel: savedChannel });
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

// route    GET /api/channels/invite/:id
// @desc    Invite Link Generation
// @access  PRIVATE
router.get("/invite/:id", (req, res) => {
  const id = req.params.id;

  Channel.findById(id)
    .then((channel) => {
      if (!channel.admins.includes(id, req.user.id)) {
        return res
          .status(401)
          .json({ errors: [{ err: "Unauthorized Access" }] });
      }

      const payload = {
        channel: {
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

          const link = "localhost:5000/api/channels/invite/" + token;
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

// route    POST /api/channels/invite/:id
// @desc    Invite Link Activation
// @access  PRIVATE
router.post("/invite/:id", [channelInvite], (req, res) => {
  const id = req.channel.id;

  Channel.findById(id)
    .then((channel) => {
      if (channel.users.includes(req.user.id)) {
        return res
          .status(400)
          .json({ errors: [{ msg: "User already joined Channel" }] });
      }

      channel.users.unshift(req.user.id);

      channel
        .save()
        .then((savedChannel) => {
          res.json({ channel: savedChannel });
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

// route    POST /api/channels/admin/:channelId/:id
// @desc    Promote to Admin
// @access  PRIVATE - Admin
router.post("/admin/:channelId/:userId", (req, res) => {
  const { channelId, userId } = req.params;

  // Check if userId is present in Current workspace users
  Channel.findById(channelId)
    .then((channel) => {
      if (channel.admins.includes(userId)) {
        return res.status(401).json({
          errors: [{ msg: "Already an Admin" }],
        });
      }

      if (
        !channel.admins.includes(req.user.id) ||
        !channel.users.includes(userId)
      ) {
        return res.status(401).json({
          errors: [{ msg: "Unauthorized Access" }],
        });
      }

      channel.admins.unshift(userId);

      channel
        .save()
        .then((savedChannel) => {
          return res.json({ channel: savedChannel });
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

// route    DELETE /api/channels/admin/:channelId/:id
// @desc    Demote Admin
// @access  PRIVATE - Admin
router.delete("/admin/:channelId/:userId", (req, res) => {
  const { channelId, userId } = req.params;

  // Check if userId is present in Current workspace users
  Channel.findById(channelId)
    .then((channel) => {
      if (
        !channel.admins.includes(req.user.id) ||
        !channel.admins.includes(userId)
      ) {
        return res.status(401).json({
          errors: [{ msg: "Unauthorized Access" }],
        });
      }

      channel.admins = channel.admins.filter((id) => {
        return id.toLocaleString() !== userId.toLocaleString();
      });

      if (channel.admins.length === 0) {
        // As there must be atlease one admin per channel
        // Make the oldest user as admin
        channel.admins.unshift(channel.users[channel.users.length - 1]);
      }

      channel
        .save()
        .then((savedChannel) => {
          return res.json({ channel: savedChannel });
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

// route    POST /api/channels/message/:channelId
// @desc    Add Message
// @access  PRIVATE
router.post(
  "/message/:channelId",
  [
    check("message", "Message is required").not().isEmpty(),
    check("avatar", "Avatar is required").not().isEmpty(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { channelId } = req.params;

    const { message, type, name, avatar } = req.body;

    ChannelfindById(channelId)
      .then((channel) => {
        if (!channel.users.includes(req.user.id)) {
          return res
            .status(401)
            .json({ errors: [{ msg: "Unauthorized Access" }] });
        }

        // Channel => History
        const newMessage = {
          message,
          user: req.user.id,
          name,
          avatar,
        };

        if (type) newMessage.type = type;

        channel.history.unshift(newMessage);

        channel
          .save()
          .then((savedChannel) => {
            return res.json({ channel: savedChannel });
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
  }
);

// route    PUT /api/channels/message/:channelId/:messageId/
// @desc    Update Message
// @access  PRIVATE
router.put(
  "/message/:channelId/:messageId",
  [check("message", "Message is required").not().isEmpty()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { channelId, messageId } = req.params;
    const { message } = req.body;

    Channel.findById(channelId)
      .then((channel) => {
        if (!channel.users.includes(req.user.id)) {
          return res
            .status(401)
            .json({ errors: [{ msg: "Unauthorized Access" }] });
        }

        channel.history = channel.history.map((msg) => {
          if (msg.user === req.user.id && msg._id === messageId) {
            msg.message = message;
          }
          return msg;
        });

        channel
          .save()
          .then((savedChannel) => {
            return res.json({ channel: savedChannel });
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
  }
);

module.exports = router;
