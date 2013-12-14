

elipsisApp.controller('VaultCtrl', function ($rootScope, $scope, $sce, $routeParams, $location, menuService, $log) {

  $log.debug('controller [VaultCtrl]')


  var categories = [
//            {name: undefined, items: []}
  ]

  $.get('/api/vaults')
    .done(function(vaults) {
      $('#vaultList').html('')
      if(vaults && vaults.length > 0) {
        for(var i = 0 ; i < vaults.length ; i++) {

          assignToCategory(vaults[i])

        }

        categories.sort(function(a, b) {
          if (a.name < b.name || !a.name) {
            return -1
          } else if (a.name > b.name || !b.name) {
            return 1
          } else {
            return 0
          }
        })

        displayCategories(categories)


      } else {
        $('#vaultList').html("You don't have any secret here, add one:")
      }
    })
    .fail(function(xhr, status, error) {
        $('#vaultList').html(error)
    })

  function displayCategory(categoryName) {

    var vaults
    for(var i = 0 ; i < categories.length ; i++) {
      if(categories[i].name === categoryName || (!categoryName && !categories[i].name)) {
        vaults = categories[i].items
      }
    }

    $('#vaultList').html('')
    if(vaults && vaults.length > 0) {
      for(var i = 0 ; i < vaults.length ; i++) {
        var vault = vaults[i]
        var listItem = $('<li class="vault-secret"><img src="/images/drag.png" width="16px" height="16px" class="drag"/> '+vault.name+'</li>')
        var passwordPlaceHolder = $('<input type="text" class="secret-placeholder" readonly/>')
        var spinner = $('<img src="/images/spinner.gif" alt="loading..."/>')
        var buttons = $('<div class="pull-right"></div>')
        var viewButton = $('<button type="button" class="btn btn-link btn-xs">view</button>')
        var hideButton = $('<button type="button" class="btn btn-link btn-xs">hide</button>')
        var deleteLink = $('<a href="/vault/delete/'+vault.uid+'?redirect=1" class="delete">delete</a>')

        listItem.append(buttons)

        buttons.append(passwordPlaceHolder)
        buttons.append(spinner)
        buttons.append(viewButton)
        buttons.append(hideButton)
        buttons.append(deleteLink)

        spinner.hide()
        hideButton.hide()
        passwordPlaceHolder.hide()

        $('#vaultList').append(listItem)

        ;(function(listItem, vault) {
          listItem.draggable({
            revert: 'invalid',
            handle: '.drag',
            cursorAt: { top: 0, left: 0 },
            cursor: 'move',
            distance: 0,
            helper: function( event ) {
              return $( '<div>'+vault.name+'</div>' );
            },
            start: function() {
              $('#newCategoryBtn').show('fade')
            },
            stop: function() {
              $('#newCategoryBtn').hide('fade')
              droppedVault = vault
            }
          })
        })(listItem, vault)

        ;(function(vault, spinner, viewButton, hideButton, passwordPlaceHolder, deleteLink, listItem) {
          var deleteClickCount = 0
          var deleteTimeout

          deleteLink.click(function() {
            if(deleteClickCount === 0) {
              deleteClickCount = 1
              deleteLink.html('confirm')
              deleteTimeout = setTimeout(function() {
                deleteTimeout = null
                deleteClickCount = 0
                deleteLink.html('delete')
              }, 1000)
              return false;
            }
            if(deleteTimeout) {
              clearTimeout(deleteTimeout)
            }

            listItem.hide('drop')
            $.get('/vault/delete/'+vault.uid)
              .done(function() {
              })
              .fail(function(xhr) {
                if(xhr.statusCode() !== 404) {
                  listItem.show('pulsate')
                  deleteLink.text('[ERROR] Could not delete. Try again')
                }
              })
            return false
          })

          viewButton.click(function() {
            viewButton.hide()
            hideButton.hide()

            if(passwordPlaceHolder.val()) {
              hideButton.show()
              passwordPlaceHolder.show()
              if(!passwordPlaceHolder.hasClass('error')) {
                passwordPlaceHolder.focus()
                passwordPlaceHolder.select()
              }
            } else {
              spinner.show()
              $.get('/vault/' + vault.uid + '?redirect=0')
                .done(function(password) {
                  spinner.hide()
                  viewButton.hide()
                  hideButton.show()
                  if(password) {
                    passwordPlaceHolder.val(password)
                    passwordPlaceHolder.show()
                    passwordPlaceHolder.focus()
                    passwordPlaceHolder.select()
                  } else {
                    passwordPlaceHolder.addClass('error')
                    passwordPlaceHolder.val('this secret is empty')
                    passwordPlaceHolder.show()
                  }
                })
                .fail(function(xhr) {
                  if(xhr.status === 401) {
                    passwordPlaceHolder.val('Session expired')
                  } else {
                    passwordPlaceHolder.val('There was an error ('+xhr.status+')')
                  }
                  hideButton.hide()
                  spinner.hide()
                  passwordPlaceHolder.addClass('error')
                  passwordPlaceHolder.show()
                })
            }
          })
          hideButton.click(function() {
            hideButton.hide()
            viewButton.show()
            passwordPlaceHolder.hide()
          })
        })(vault, spinner, viewButton, hideButton, passwordPlaceHolder, deleteLink, listItem);

      }

//                displayCategories(categories)



    } else {
      $('#vaultList').html("You don't have any secret here.")
    }
  }

  function assignToCategory(vault) {

    var category
    for(var j = 0 ; j < categories.length ; j++) {
      if(categories[j].name === vault.category || (!vault.category && !categories[j].name)) {
        category = categories[j]
        break;
      }
    }
    if(!category) {
      category = {
        name: vault.category,
        items: []
      }
      categories.push(category)
    }

    category.items.push(vault)
  }

  var droppedVault

  function displayCategories(categoryList) {

    for(var i = 0 ; i < categoryList.length ; i++) {
      var displayName = categoryList[i].name || 'Uncategorized'
      var id = categoryList[i].name ? ("'" + categoryList[i].name + "'") : undefined
      var cat = $('<li class="category" el-name="'+categoryList[i].name+'"><a href="#" onclick="selectCategory('+i+', '+id+')">'+displayName+'</a></li>')
      $('#categoryList').append(cat);
      if(i === 0) {
        cat.addClass('active')

        displayCategory(categoryList[i].name);
      }
    }

    var add = $('<li class="category"><a href="#" id="newCategoryBtn">Create a new category...</a></li><li><input id="newCategoryInput" type="text" class="btn" value="Category name"/><button id="newCategoryCreateBtn" class="btn-sm btn-success">Add</button></li>')
    $('#categoryList').append(add)

    $('#newCategoryBtn').hide()

    $('.category').droppable({
      activeClass: "ready",
      hoverClass: "accept",
      drop: function( event, ui ) {
        setTimeout(function() {
//                        $(ui.draggable).hide();
          if($(event.target).attr('el-name')) {
            var name = $(event.target).attr('el-name')

            if($(event.target).attr('el-name') === 'undefined' ||
              $(event.target).attr('el-name') === 'null' ||
              !$(event.target).attr('el-name')) {
              name = null
            }
            saveNewCategory(name)
          } else {
            setCategoryName()
          }
        }, 30)

      }
    })

    $('#newCategoryInput').hide()
    $('#newCategoryCreateBtn').hide()

    function setCategoryName() {
      if(cancelTimeout) {
        clearTimeout(cancelTimeout)
      }
      $('#newCategoryBtn').hide()
      $('#newCategoryInput').show('fade')
      $('#newCategoryCreateBtn').show('fade')
      $('#newCategoryInput').select()
      return false
    }

    $('#newCategoryBtn').click(function(event) {
      setCategoryName()
    })

    $('#newCategoryInput').keyup(function(e) {
      // return
      if (e.target == $('#newCategoryInput')[0] && e.keyCode == 13) { saveNewCategory($('#newCategoryInput').val()) }

      // esc
      if (e.keyCode == 27) { cancelNewCategory() }
    })

    $('#newCategoryCreateBtn').click(function() {
      console.log('click: '+$('#newCategoryInput').val())
      saveNewCategory($('#newCategoryInput').val())
    })

    function saveNewCategory(categoryName) {
      cancelNewCategory()

      if(!categoryName) {
        categoryName = undefined
      }

      if(droppedVault) {
        var vault = droppedVault
        vault.category = categoryName
        $.post('/api/vault', vault)
          .done(function() {
            cancelNewCategory()
            location.reload()
            droppedVault = null
          })
          .fail(function(xhr) {
            cancelNewCategory()
          })
      } else {
        cancelNewCategory()
      }
    }

    function cancelNewCategory() {
      if(cancelTimeout) {
        clearTimeout(cancelTimeout)
      }
      $('#newCategoryBtn').hide('fade')
      $('#newCategoryInput').hide('fade')
      $('#newCategoryCreateBtn').hide('fade')
      //$('#newCategoryInput').val('Category name')
    }
    var cancelTimeout

    $('#newCategoryInput').focusout(function(event) {
      cancelTimeout = setTimeout(function() {
        cancelTimeout = undefined
        cancelNewCategory()
      }, 300)
      event.preventDefault()
      return false
    })
  }

  window.selectCategory = function(index, cat) {
    if(!index) { index = 0 }
    $('.category').removeClass('active')
    $('.category:eq('+index+')').addClass('active')
    displayCategory(cat)
  }

  $('#generateSecretBtn').click(function(event) {
    try {
      var pwd = $.generatePassword(30, false)
    } catch(err) {
      // TODO: log
    }
    $('#secret').val(pwd)
    $('#secret').select()
    event.preventDefault()
    return false
  })



})
